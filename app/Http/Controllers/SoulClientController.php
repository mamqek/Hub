<?php

namespace App\Http\Controllers;

use App\Models\SoulClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class SoulClientController extends Controller
{
    public function getClient(){

    }

    public function getAllClients(){
        $user = Auth::user();
        $clients = SoulClient::where('user_id', $user->id)->get();
        return $clients;
    }

    public function saveClient(Request $request){
        $user = Auth::user();
        $client = $request->input('client');
        $souls = $request->input('souls');

        try {

            $client = SoulClient::updateOrCreate(
            [
                'name' => $client['name'],
                'date' => $client['date'],
                'date_of_birth' => $client['dateOfBirth'],
                'user_id' => $user->id,
            ],
            [
                'souls' => $souls,
            ]);

            return response()->json([
                'status' => __('response.success'),
                'message' => __('response.*_saved_successfully', ['attribute' => __('client')]),
                'client' => $client
            ], 200);

        } catch (\Exception $e) {

            return response()->json([
                'status' => __('response.error'),
                'message' => __('response.error_while_*', ['action' => __('response.saving'), 'attribute' => __('client')]),
                'error' => $e->getMessage()
            ], 500);

        }
    }
}
