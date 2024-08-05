<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Soul;

class SoulController extends Controller
{
    
    /**
     * Get all records grouped by group name and return as array.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAllRecordsGrouped()
    {
        // Fetch the records grouped by group name
        $recordsGrouped = Soul::getAllGroupedByGroupName();

        // Format the records into the desired array structure
        $data = $recordsGrouped->map(function ($group, $key) {
            return [
                'group_name' => $key,
                'records' => $group->toArray(),
            ];
        })->values()->toArray();

        // Return as JSON response
        return response()->json($data);
    }
}
