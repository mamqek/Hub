<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class RecipeController extends Controller
{

    public function getRecipe(Request $request) {
        $item = $request->query('item');
        $amount = $request->query('amount');
        Log::info('Current directory: ' . getcwd());
        
        $returnVar = 0;

        $directoryPath = public_path('recepiesRust/');
        chdir($directoryPath);
        exec('satisfactory_factory_planner.exe "'.$item.': '.$amount.'"', $output, $returnVar);
        
        $recipeNodes = $this->parseTree($output);
        $ingredientsData = $this->parseIngredients($output);

        if ($returnVar !== 0) {
            return response()->json(['error' => implode("\n", $output)], 500);
        }

        return response()->json([
            "recipeNodeArr" => $recipeNodes,
            "ingredientsData" => $ingredientsData
        ] , 200);
        // return response()->json(['output' =>  $output], 200);
    }

    protected function parseTree($output) {

        $stack = [];
        $recipesArr = [];
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
            } elseif (strpos($line, '- ') !== false) {
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

                    // save the byproduct node to the parent node in stack
                    $stack[$indentLevel]['byproducts'] = [];
                    $stack[$indentLevel]['byproducts'][] = $newNode;

                    // add node's id to parent in array
                    $recipesArr[$stack[$indentLevel]['id']]['byproducts'] = [];
                    $recipesArr[$stack[$indentLevel]['id']]['byproducts'][] = [
                        'id' => $newNode['id'],
                        'productionRate' => $newNode['productionRate'],
                        'itemName' => $newNode['itemName'],
                    ];
                } else {

                    $stack[$indentLevel - 1]['ingredients'][] = $newNode;
                    $ingredientsArrLength = count($stack[$indentLevel - 1]['ingredients']);
                    $stack[] = &$stack[$indentLevel - 1]['ingredients'][$ingredientsArrLength - 1];

                    // add node's id to parent 
                    $recipesArr[$stack[$indentLevel - 1]['id']]['ingredients'][] = $newNode['id'];
                    $newNode['parentId'] = $stack[$indentLevel - 1]['id'];
                }
            } else {
                $stack[] = $newNode;
            }
            
            $recipesArr[] = $newNode;
            $count +=1;
        }
        // Log::info(print_r($stack[0], true));

        return $recipesArr;
    }

    function parseIngredients($output) {

        $index = 0;
        do {
            $index++;
        } while ($output[$index] !== "Input Ingredients:");

        $index++;

        $inputIngredients = [];
        while ($output[$index] !== "") {
            $inputIngredients[] = $this->ingredientToObj($output[$index]);
            $index++;
        }

        $index+=2;

        $intermidieteIngredients = [];
        while ($output[$index] !== "") {
            $intermidieteIngredients[] = $this->ingredientToObj($output[$index]);
            $index++;
        }
        $ingredients['intermidiete'] = $intermidieteIngredients;
        
        $index+=2;
        
        $outputIngredients = [];
        while ($output[$index] !== "") {
            $outputIngredients[] = $this->ingredientToObj($output[$index]);
            $index++;
        }

        $index+=1;
        
        if ($output[$index] !== "Byproducts:") {
            return $ingredients;
        }

        $index+=1;
        $byproductIngredients = [];
        while ($output[$index] !== "") {
            $byproductIngredients[] = $this->ingredientToObj($output[$index]);
            $index++;
        }

        return [
            "input" => $inputIngredients,
            "intermidiete" => $intermidieteIngredients,
            "output" => $outputIngredients,
            "byproduct" => $byproductIngredients,
        ];
    }

    function getIndentLevel($line) {
        return ((strlen($line) - strlen(ltrim($line, ' '))) - 1) / 2; // Assuming 3 spaces per indent level
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

    protected function ingredientToObj($row) {
        preg_match('/([\d.]+)\s+(.*?)$/', $row, $matches); // For lines without producer (basic resources)

        if ($matches) {
            return [
                'amount' => $matches[1],         // First number (rate)
                'itemName' => trim($matches[2]),   // Item name (trim spaces)
            ];
        }
        
    }
    
    
    
}
