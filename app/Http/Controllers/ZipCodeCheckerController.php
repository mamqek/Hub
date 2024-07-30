<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Item;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ZipCodeCheckerController extends Controller
{
    private $headers;

    public function __construct()
    {
        $this->headers = [
            'X-Api-Key' => config('services.external_api.key'),
        ];
    }

    public function checkZipCode(Request $request)
    {
        $zipCode = $request->input('zip_code');
        $houseNumber = $request->input('huisnummer');
        $houseLetter = $request->input('huisletter');
        
        $queryParams = [
            'zip_code' => $zipCode,
            'house_number' => $houseNumber,
        ];
        
        if (!is_null($houseLetter)) {
            $queryParams['house_letter'] = $houseLetter;
        }
        
        $response = Http::withHeaders($this->headers)->
            get('https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/adressen', $queryParams);

        Log::info('Response from external API' . print_r($response, true));

        Log::info('Request to external API', [
            'url' => 'https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/adressen',
            'headers' => $this->headers,
            'queryParams' => $queryParams,
        ]);
        // Check if the request was successful
        if ($response->successful()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Zip code is valid',
                'data' => $response->json(),
            ]);
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to validate zip code',
            ], $response->status());
        }

        

    }

}
