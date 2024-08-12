<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\AddressResponse;
use App\Models\AddressSearch;
use App\Models\AddressSearchAddress;
use Illuminate\Http\Request;
use App\Models\Item;
use Error;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BagAPIController extends Controller
{
    
    private function sendRequest($type, $endpoint, $params)
    {
        try {

        
            $base_link = "https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/";
            
            $headers = [
                'X-Api-Key' => config('services.external_api.bag_kadaster.key'),
                'Content-Crs' => 'EPSG:28992',
                'Accept-Crs' => 'EPSG:28992',
            ];

            if ($type == "get") {
                $response = Http::withHeaders($headers)->get($base_link.$endpoint, $params);
            } else {
                
            }

        } catch (\Exception $e) {

            return response()->json([
                'status' => 'error',
                'message' => 'Error sending the request to API',
                'error' => $e->getMessage()
            ], 500);

        }

        return $response;
        
    }

    public function checkZipCode(Request $request)
    {
        $postcode = $request->input('postcode');
        $huisnummer = $request->input('huisnummer');
        $huisletter = $request->input('huisletter');
        $exactMatch = $request->input('exactMatch');

        $queryParams = [
            'postcode' => $postcode,
            'huisnummer' => $huisnummer,
            'exacteMatch' => $exactMatch,
        ];
        
        if (!is_null($huisletter)) {
            $queryParams['huisletter'] = $huisletter;
        }
        
        $response = $this->sendRequest('get','adressen', $queryParams);

        try {

            $addressSearch = new AddressSearch();
            $addressSearch = $addressSearch->incrementOrCreate($queryParams);
            // Check if the request was successful
            $decoded_response = json_decode($response);

            if (property_exists($decoded_response, '_embedded')) {
                
                $addresses = $decoded_response->_embedded->adressen;
                $addressRecords = [];
                foreach ($addresses as $address) {
                    $addressRecord = Address::firstOrCreate([
                        'nummeraanduidingIdentificatie' => $address->nummeraanduidingIdentificatie
                    ]);
                    AddressSearchAddress::firstOrCreate([
                        'address_search_id' => $addressSearch->id,
                        'address_id' => $addressRecord->id
                    ]);
                    $addressRecords[] = $addressRecord;
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'Address is valid',
                    'data' => $response->json(),
                    'addressRecords' => $addressRecords
                ], 200);
                
            } else {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Address is not found',
                ], $response->status());
            }
            
                
        } catch (\Exception $e) {

            return response()->json([
                'status' => 'error',
                'message' => 'Database error',
                'error' => $e->getMessage()
            ], 500);

        }


    }

    public function link(Request $request) {
        $endpoint = $request->input('endpoint');
        $addressRecordId = $request->input('addressRecordId');

        $response = $this->sendRequest('get', $endpoint, []);
        
        try{

            if ($response->successful()) {
                $responseJSON = $response->json();

                AddressResponse::updateOrCreate([
                    'address_id' => $addressRecordId,
                    'endpoint' => $endpoint
                ],
                [
                    'response' => $responseJSON
                ]);

                return response()->json([
                    'status' => 'success',
                    'message' => 'Data fetched',
                    'data' => $responseJSON,
                ]);
            } else {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Failed to fetch data',
                ], $response->status());
            }
        } catch (\Exception $e) {

            return response()->json([
                'status' => 'error',
                'message' => 'Database error',
                'error' => $e->getMessage()
            ], 500);

        }
    }

}
