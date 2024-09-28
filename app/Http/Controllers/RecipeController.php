<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RecipeController extends Controller
{
    public function getRecipe(Request $request) {
        $item = $request->query('item');
        $amount = $request->query('amount');
        
        $output = [];
        $returnVar = 0;

        $directoryPath = public_path('recepiesRust/');
        chdir($directoryPath);

        exec('satisfactory_factory_planner.exe "'.$item.': '.$amount.'"', $output, $returnVar);

        $recipeData = $this->parseOutput($output);

        if ($returnVar !== 0) {
            return response()->json(['error' => implode("\n", $output)], 500);
        }

        return response()->json($recipeData , 200);
        // return response()->json(['output' =>  $output], 200);
    }
    
    function getIndentLevel($line) {
        return ((strlen($line) - strlen(ltrim($line, ' '))) - 1) / 2; // Assuming 3 spaces per indent level
    }
    

    protected function parseOutput($output) {

        $stack = [];
        $arr = [];
        $count = 0;
        
        foreach ($output as $index => $line) {
            if ( $index == 0 || $index == 1) {
                $count = 0;
                continue;
            }

            if ($line === "") {
                break;
            }

            // Remove leading * or - or < and parse the details
            $indentLevel = $this->getIndentLevel($line);
            $newNode = $this->parseRow($line, $count, $indentLevel);


            // Check if it's a byproduct or base material
            if (strpos($line, '<') !== false) {
                $newNode['byproduct'] = true;
            } elseif (strpos($line, '-') !== false) {
                $newNode['isBaseMaterial'] = true;
            }

            // Traverse up the stack to the appropriate parent
            while ((count($stack) > $indentLevel + (isset($newNode['byproduct']) ? 1 : 0))) {
                array_pop($stack);
            }
            
            $stackSize =  count($stack);

            if ($stackSize > 0) {
                if (isset($newNode['byproduct'])) {
                    unset($newNode['byproduct']);
                    unset($newNode['machine']);
                    $stack[$indentLevel]['byproducts'] = [];
                    $stack[$indentLevel]['byproducts'][] = $newNode;

                    $arr[$stack[$indentLevel]['id']]['byproduct'] = [];
                    $arr[$stack[$indentLevel]['id']]['byproduct'][] = $newNode['id'];
                } else {

                    $stack[$indentLevel - 1]['ingredients'][] = $newNode;
                    $ingredientsArrLength = count($stack[$indentLevel - 1]['ingredients']);
                    $stack[] = &$stack[$indentLevel - 1]['ingredients'][$ingredientsArrLength - 1];

                    // add node's id to parent 
                    $arr[$stack[$indentLevel - 1]['id']]['ingredients'][] = $newNode['id'];
                    $newNode['parentId'] = $stack[$indentLevel - 1]['id'];
                }
            } else {
                $stack[] = $newNode;
            }
            
            $arr[] = $newNode;
            $count +=1;
        }
        Log::info(print_r($stack[0], true));

        return $arr;
        // return [
        //     "recipeJson" => $stack[0],
        //     "recipeComponentsArr" => $arr
        // ];
    }

    protected function parseRow($row, $count, $indentLevel) {
        preg_match('/^\s*[\*\-<]\s*(\d+\.\d+)\s+([a-zA-Z\s\-]+):\s+(\d+\.\d+)\s+([a-zA-Z\s]+)/', $row, $matches);

        // Return the parsed values in an associative array if matched
        if ($matches) {
            return [
                'id' => $count,
                'productionRate' => $matches[1],         // First number (rate)
                'itemName' => trim($matches[2]),   // Item name (trim spaces)
                'machineCount' => $matches[3], // Second number (count of machines)
                'machineName' => $matches[4],       // Machine type
                'indentLevel' => $indentLevel,
                'ingredients' => []                // ingredients nodes ids
            ];
        }
        
        preg_match('/([\d.]+)\s+(.*?)$/', $row, $matches); // For lines without producer (basic resources)

        if ($matches) {
            return [
                'id' => $count,
                'productionRate' => $matches[1],         // First number (rate)
                'itemName' => trim($matches[2]),   // Item name (trim spaces)
                'indentLevel' => $indentLevel,
                'machineName' => "*Extractor"       // Machine type
            ];
        }

    }
    
    
    
}
