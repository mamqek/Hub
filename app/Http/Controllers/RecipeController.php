<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RecipeController extends Controller
{

    public function getRecipe(Request $request) {
        $item = $request->query('item');
        if (!$item) {
            return response()->json(['error' => 'Missing item parameter.'], 400);
        }
        $amount = (float) ($request->query('amount') ?? 1);
        Log::info('Calling calculation service for: ' . $item . ' with amount ' . $amount);

        $selectedRecipes = $this->parseSelectedRecipes($request->query('selectedRecipes'));
        $optimizationGoals = $this->parseOptimizationGoals($request->query('optimizationGoals'));
        $result = $this->fetchCalcOutput($item, $amount, [], false, $selectedRecipes, $optimizationGoals);
        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], $result['status'] ?? 500);
        }
        Log::info('Received calculation result for: ' . print_r($result, true));

        $recipeNodes = $result['recipeNodeArr'] ?? [];
        $ingredientsData = $result['ingredientsData'] ?? [
            'input' => [],
            'intermediate' => [],
            'output' => [],
            'byproduct' => [],
        ];

        return response()->json([
            "recipeNodeArr" => $recipeNodes,
            "ingredientsData" => $ingredientsData,
            "recipeOptions" => $result['recipeOptions'] ?? []
        ] , 200);
        // return response()->json(['output' =>  $output], 200);
    }

    public function getBaseIngredients(Request $request) {
        $item = $request->query('item') ?? $request->query('recipe');
        if (!$item) {
            return response()->json(['error' => 'Missing item parameter.'], 400);
        }

        $amount = (float) ($request->query('amount') ?? 1);
        $selectedRecipes = $this->parseSelectedRecipes($request->query('selectedRecipes'));
        $optimizationGoals = $this->parseOptimizationGoals($request->query('optimizationGoals'));
        $result = $this->fetchCalcOutput($item, $amount, [], false, $selectedRecipes, $optimizationGoals);
        if (isset($result['error'])) {
            return response()->json(['error' => $result['error']], $result['status'] ?? 500);
        }

        $ingredientsData = $result['ingredientsData'] ?? [
            'input' => [],
            'intermediate' => [],
            'output' => [],
            'byproduct' => [],
        ];
        $baseIngredients = $ingredientsData['input'] ?? [];

        return response()->json([
            'item' => $item,
            'baseIngredients' => $baseIngredients,
            'recipeOptions' => $result['recipeOptions'] ?? [],
        ], 200);
    }

    public function getRecipeWithLimits(Request $request) {
        $item = $request->input('item') ?? $request->query('item') ?? $request->input('recipe') ?? $request->query('recipe');
        if (!$item) {
            return response()->json(['error' => 'Missing item parameter.'], 400);
        }

        $requestedAmount = $request->input('amount') ?? $request->query('amount');
        $useIngredientsToMax = $request->input('useIngredientsToMax');
        $useIngredientsToMax = filter_var($useIngredientsToMax, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($useIngredientsToMax === null) {
            $useIngredientsToMax = false;
        }
        $selectedRecipes = $this->parseSelectedRecipes($request->input('selectedRecipes', $request->query('selectedRecipes')));
        $optimizationGoals = $this->parseOptimizationGoals($request->input('optimizationGoals', $request->query('optimizationGoals')));

        $rawIngredients = $request->input('ingredients', $request->query('ingredients'));
        if (is_string($rawIngredients)) {
            $rawIngredients = json_decode($rawIngredients, true);
        }

        if (!is_array($rawIngredients) || count($rawIngredients) === 0) {
            return response()->json(['error' => 'Missing or invalid ingredients array.'], 400);
        }

        $amount = $requestedAmount !== null ? (float) $requestedAmount : 1.0;
        $boundedResult = $this->fetchCalcOutput($item, $amount, $rawIngredients, $useIngredientsToMax, $selectedRecipes, $optimizationGoals);
        if (isset($boundedResult['error'])) {
            return response()->json(['error' => $boundedResult['error']], $boundedResult['status'] ?? 500);
        }

        $recipeNodes = $boundedResult['recipeNodeArr'] ?? [];
        $ingredientsData = $boundedResult['ingredientsData'] ?? [
            'input' => [],
            'intermediate' => [],
            'output' => [],
            'byproduct' => [],
        ];

        $resolvedAmount = $boundedResult['amount'] ?? null;
        if ($resolvedAmount === null) {
            $resolvedAmount = $this->findOutputAmount($ingredientsData['output'] ?? [], $item);
        }

        $limitingIngredient = $this->findLimitingIngredient($rawIngredients, $ingredientsData['input'] ?? []);

        return response()->json([
            'item' => $item,
            'amount' => $resolvedAmount,
            'limits' => $this->normalizeIngredientList($rawIngredients),
            'limitedBy' => $limitingIngredient,
            'recipeNodeArr' => $recipeNodes,
            'ingredientsData' => $ingredientsData,
            'recipeOptions' => $boundedResult['recipeOptions'] ?? [],
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
            if (str_starts_with($lower, 'output ingredients') || str_starts_with($lower, 'output products')) {
                $currentType = 'output';
                continue;
            }
            if (str_starts_with($lower, 'byproduct ingredients') || str_starts_with($lower, 'byproducts')) {
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

    protected function fetchCalcOutput(
        string $item,
        float $amount,
        array $ingredients = [],
        bool $useIngredientsToMax = false,
        array $selectedRecipes = [],
        array $optimizationGoals = []
    ): array {
        $calcServiceUrl = env('CALC_SERVICE_URL');
        if (!$calcServiceUrl) {
            return ['error' => 'CALC_SERVICE_URL is not configured.', 'status' => 500];
        }

        $payload = [
            'item' => $item,
            'amount' => $amount,
        ];

        if ($ingredients) {
            $payload['ingredients'] = $ingredients;
            $payload['useIngredientsToMax'] = $useIngredientsToMax;
        }
        if ($selectedRecipes) {
            $payload['selectedRecipes'] = $selectedRecipes;
        }
        if ($optimizationGoals) {
            $payload['optimizationGoals'] = $optimizationGoals;
        }

        $response = Http::post($calcServiceUrl . 'run-calc', $payload);

        if ($response->failed()) {
            return ['error' => $response->body(), 'status' => 500];
        }

        return $response->json();
    }

    protected function parseSelectedRecipes($value): array {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value) && trim($value) !== '') {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
        return [];
    }

    protected function parseOptimizationGoals($value): array {
        if (is_array($value)) {
            return $this->normalizeOptimizationGoals($value);
        }

        if (is_string($value) && trim($value) !== '') {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return $this->normalizeOptimizationGoals($decoded);
            }
        }

        return [];
    }

    protected function normalizeOptimizationGoals(array $goals): array {
        $normalized = [];
        foreach ($goals as $goal) {
            if (!is_array($goal) || count($goal) < 2) {
                continue;
            }
            $goalType = $goal[0] ?? null;
            $goalValue = $goal[1] ?? null;
            if (!is_string($goalType) || trim($goalType) === '' || $goalValue === null) {
                continue;
            }
            $normalized[] = [$goalType, $goalValue];
        }
        return $normalized;
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

    protected function findOutputAmount(array $outputItems, string $item): ?float {
        foreach ($outputItems as $output) {
            if (!is_array($output)) {
                continue;
            }
            $name = $output['itemName'] ?? null;
            if (!$name) {
                continue;
            }
            if (strtolower($name) === strtolower($item)) {
                return (float) ($output['amount'] ?? 0);
            }
        }

        return null;
    }

    protected function findLimitingIngredient(array $limits, array $inputs): ?string {
        if (!count($limits) || !count($inputs)) {
            return null;
        }

        $inputMap = [];
        foreach ($inputs as $input) {
            if (!is_array($input)) {
                continue;
            }
            $name = $input['itemName'] ?? null;
            $amount = $input['amount'] ?? null;
            if (!$name || $amount === null) {
                continue;
            }
            $inputMap[$this->normalizeIngredientName($name)] = (float) $amount;
        }

        $limitingIngredient = null;
        $bestRatio = null;
        foreach ($limits as $limit) {
            if (!is_array($limit)) {
                continue;
            }
            $name = $limit['itemName'] ?? $limit['name'] ?? null;
            $limitAmount = $limit['amount'] ?? $limit['qty'] ?? null;
            if (!$name || $limitAmount === null) {
                continue;
            }
            $key = $this->normalizeIngredientName($name);
            if (!isset($inputMap[$key]) || $limitAmount <= 0) {
                continue;
            }
            $ratio = $inputMap[$key] / (float) $limitAmount;
            if ($bestRatio === null || $ratio > $bestRatio) {
                $bestRatio = $ratio;
                $limitingIngredient = $name;
            }
        }

        return $limitingIngredient;
    }
}
