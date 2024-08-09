<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Soul;
use App\Models\SoulClient;
use Illuminate\Support\Facades\Log;

class SoulController extends Controller
{
    
    /**
     * Get all records grouped by group name and return as array.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAllRecordsGrouped()
    {
        try {
            // Fetch the records grouped by group name
            $recordsGrouped = Soul::getAllGroupedByGroupName();

            // Format the records into the desired array structure
            $data = $recordsGrouped->map(function ($group, $key) {
                return [
                    'group_name' => $key,
                    'records' => $group->toArray(),
                ];
            })->values()->toArray();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Souls fetched succesfully',
                'souls' => $data
            ], 200);

        } catch (\Exception $e) {

            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while saving client',
                'error' => $e->getMessage()
            ], 500);

        }
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
                'souls' => json_encode($souls),
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
