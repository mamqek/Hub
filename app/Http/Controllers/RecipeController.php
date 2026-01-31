<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RecipeController extends Controller
{

    public function getRecipe(Request $request) {
        $item = $request->query('item');
        $amount = $request->query('amount');
        Log::info('Calling calculation service for: ' . $item . ' with amount ' . $amount);

        $result = $this->fetchCalcOutput($item, (float) $amount);
        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], $result['status'] ?? 500);
        }

        $output = $result['output'] ?? [];
        
        $recipeNodes = $this->parseTree($output);
        $ingredientsData = $this->parseIngredients($output);

        return response()->json([
            "recipeNodeArr" => $recipeNodes,
            "ingredientsData" => $ingredientsData
        ] , 200);
        // return response()->json(['output' =>  $output], 200);
    }

    public function getBaseIngredients(Request $request) {
        $item = $request->query('item') ?? $request->query('recipe');
        if (!$item) {
            return response()->json(['error' => 'Missing item parameter.'], 400);
        }

        $amount = (float) ($request->query('amount') ?? 1);
        $result = $this->fetchCalcOutput($item, $amount);
        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], $result['status'] ?? 500);
        }

        $output = $result['output'] ?? [];
        $ingredientsData = $this->parseIngredients($output);
        $baseIngredients = $ingredientsData['input'] ?? [];

        return response()->json([
            'item' => $item,
            'baseIngredients' => $baseIngredients,
        ], 200);
    }

    public function getRecipeWithLimits(Request $request) {
        $item = $request->input('item') ?? $request->query('item') ?? $request->input('recipe') ?? $request->query('recipe');
        if (!$item) {
            return response()->json(['error' => 'Missing item parameter.'], 400);
        }

        $rawIngredients = $request->input('ingredients', $request->query('ingredients'));
        if (is_string($rawIngredients)) {
            $rawIngredients = json_decode($rawIngredients, true);
        }

        if (!is_array($rawIngredients) || count($rawIngredients) === 0) {
            return response()->json(['error' => 'Missing or invalid ingredients array.'], 400);
        }

        $limitMap = $this->buildIngredientMap($rawIngredients);
        if (count($limitMap) === 0) {
            return response()->json(['error' => 'No valid ingredient limits provided.'], 400);
        }

        $perUnitResult = $this->fetchCalcOutput($item, 1.0);
        if (isset($perUnitResult['error'])) {
            return response()->json(['error' => $perUnitResult['error']], $perUnitResult['status'] ?? 500);
        }

        $perUnitIngredients = $this->parseIngredients($perUnitResult['output'] ?? []);
        $perUnitInputMap = $this->buildIngredientMap($perUnitIngredients['input'] ?? []);

        if (count($perUnitInputMap) === 0) {
            return response()->json(['error' => 'Unable to determine base ingredients for this recipe.'], 500);
        }

        $maxAmount = null;
        $limitingIngredient = null;

        foreach ($limitMap as $key => $limitAmount) {
            if (!isset($perUnitInputMap[$key])) {
                return response()->json(['error' => 'Ingredient not used in recipe: ' . $this->restoreIngredientName($key, $rawIngredients)], 400);
            }

            $requiredPerUnit = $perUnitInputMap[$key];
            if ($requiredPerUnit <= 0) {
                continue;
            }

            $candidate = $limitAmount / $requiredPerUnit;
            if ($maxAmount === null || $candidate < $maxAmount) {
                $maxAmount = $candidate;
                $limitingIngredient = $this->restoreIngredientName($key, $rawIngredients);
            }
        }

        if ($maxAmount === null || $maxAmount <= 0) {
            return response()->json(['error' => 'Unable to compute recipe amount from provided limits.'], 400);
        }

        $boundedResult = $this->fetchCalcOutput($item, $maxAmount);
        if (isset($boundedResult['error'])) {
            return response()->json(['error' => $boundedResult['error']], $boundedResult['status'] ?? 500);
        }

        $output = $boundedResult['output'] ?? [];
        $recipeNodes = $this->parseTree($output);
        $ingredientsData = $this->parseIngredients($output);

        return response()->json([
            'item' => $item,
            'amount' => $maxAmount,
            'limits' => $this->normalizeIngredientList($rawIngredients),
            'limitedBy' => $limitingIngredient,
            'recipeNodeArr' => $recipeNodes,
            'ingredientsData' => $ingredientsData,
        ], 200);
    }

    protected function parseTree($output) {

        $stack = [];
        $recipesArr = [];
        $count = 0;
        
        foreach ($output as $index => $line) {
            if ( $index == 0 ) {
                $count = 0;
                continue;
            }

            // Stop parsing when we reach the input ingredients
            if (strpos($line, 'Input') !== false) {
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
        $ingredients = [
            'input' => [],
            'intermediate' => [],
            'output' => [],
            'byproduct' => [],
        ];
        $currentType = null;

        foreach ($output as $line) {
            $trimmed = trim($line);
            $lower = strtolower($trimmed);

            if (str_starts_with($lower, 'input ingredients')) {
                $currentType = 'input';
                continue;
            }
            if (str_starts_with($lower, 'intermediate ingredients')) {
                $currentType = 'intermediate';
                continue;
            }
            if (str_starts_with($lower, 'output ingredients')) {
                $currentType = 'output';
                continue;
            }
            if (str_starts_with($lower, 'byproduct ingredients')) {
                $currentType = 'byproduct';
                continue;
            }

            if ($currentType && str_starts_with(ltrim($line), '*')) {
                $ingredient = $this->ingredientToObj($line);
                if ($ingredient) {
                    $ingredients[$currentType][] = $ingredient;
                }
            }
        }

        return $ingredients;
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

    protected function fetchCalcOutput(string $item, float $amount): array {
        $calcServiceUrl = env('CALC_SERVICE_URL');
        if (!$calcServiceUrl) {
            return ['error' => 'CALC_SERVICE_URL is not configured.', 'status' => 500];
        }

        $response = Http::get($calcServiceUrl . 'run-calc', [
            'item' => $item,
            'amount' => $amount,
        ]);

        if ($response->failed()) {
            return ['error' => $response->body(), 'status' => 500];
        }

        return [
            'output' => $response->json()['output'] ?? [],
        ];
    }

    protected function buildIngredientMap(array $ingredients): array {
        $map = [];
        foreach ($ingredients as $ingredient) {
            if (!is_array($ingredient)) {
                continue;
            }

            $name = $ingredient['itemName'] ?? $ingredient['name'] ?? null;
            $amount = $ingredient['amount'] ?? $ingredient['qty'] ?? null;

            if (!$name || $amount === null) {
                continue;
            }

            $key = $this->normalizeIngredientName($name);
            $value = (float) $amount;
            if ($value <= 0) {
                continue;
            }

            $map[$key] = ($map[$key] ?? 0) + $value;
        }

        return $map;
    }

    protected function normalizeIngredientList(array $ingredients): array {
        $normalized = [];
        foreach ($ingredients as $ingredient) {
            if (!is_array($ingredient)) {
                continue;
            }
            $name = $ingredient['itemName'] ?? $ingredient['name'] ?? null;
            $amount = $ingredient['amount'] ?? $ingredient['qty'] ?? null;

            if (!$name || $amount === null) {
                continue;
            }

            $normalized[] = [
                'itemName' => trim($name),
                'amount' => (float) $amount,
            ];
        }

        return $normalized;
    }

    protected function normalizeIngredientName(string $name): string {
        $name = preg_replace('/\s+/', ' ', trim($name));
        return strtolower($name);
    }

    protected function restoreIngredientName(string $key, array $ingredients): string {
        foreach ($ingredients as $ingredient) {
            if (!is_array($ingredient)) {
                continue;
            }
            $name = $ingredient['itemName'] ?? $ingredient['name'] ?? null;
            if (!$name) {
                continue;
            }
            if ($this->normalizeIngredientName($name) === $key) {
                return $name;
            }
        }

        return $key;
    }
}
