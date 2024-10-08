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
                'status' => __('response.success'),
                'message' => __('soul_numbers')." ".__('response.fetched'),
                'souls' => $data
            ], 200);

        } catch (\Exception $e) {

            return response()->json([
                'status' => __('response.error'),
                'message' => __('error_while_*', [ 'action' => __('response.fetching') , 'attribute' => __('soul_numbers') ]),
                'error' => $e->getMessage()
            ], 500);

        }
    }


    

}
