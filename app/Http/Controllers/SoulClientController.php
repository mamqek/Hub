<?php

namespace App\Http\Controllers;

use App\Models\SoulClient;
use Illuminate\Http\Request;

class SoulClientController extends Controller
{
    public function getClient(){

    }

    public function getAllClients(){
        $clients = SoulClient::all();
        return $clients;
    }

    public function saveClient(Request $request){
        $client = $request->input('client');
        $souls = $request->input('souls');

        try {

            $client = SoulClient::updateOrCreate(
            [
                'name' => $client['name'],
                'date' => $client['date'],
                'date_of_birth' => $client['dateOfBirth'],
            ],
            [
                'souls' => $souls,
            ]);
            
            return response()->json([
                'status' => 'success',
                'message' => 'Client saved successfully',
                'client' => $client
            ], 200);

        } catch (\Exception $e) {

            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while saving client',
                'error' => $e->getMessage()
            ], 500);

        }
    }
}
