<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\AddressSearch;
use Illuminate\Http\Request;
use App\Models\Item;
use Error;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BagAPIController extends Controller
{
    
    private function sendRequest($type, $endpoint, $params)
    {
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
        
        $addressSearch = new AddressSearch();
        $addressSearch->incrementOrCreate($queryParams);
        
        $response = $this->sendRequest('get','adressen', $queryParams);

        // Check if the request was successful
        if (property_exists(json_decode($response), '_embedded')) {
            return response()->json([
                'status' => 'success',
                'message' => 'Address is valid',
                'data' => $response->json(),
            ]);
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'Address is not found',
            ], $response->status());
        }

    }

    public function link(Request $request) {
        $endpoint = $request->input('endpoint');

        $response = $this->sendRequest('get', $endpoint, []);

        if ($response->successful()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Data fetched',
                'data' => $response->json(),
            ]);
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch data',
            ], $response->status());
        }
    }

}
