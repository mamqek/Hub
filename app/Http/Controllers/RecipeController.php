<?php

namespace App\Http\Controllers;

use App\Services\SatisfactoryAlternateRecipeStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RecipeController extends Controller
{
    public function __construct(protected SatisfactoryAlternateRecipeStore $alternateRecipeStore)
    {
    }

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
            return response()->json([
                'error' => $result['error'],
                'userMessage' => $result['userMessage'] ?? null,
                'details' => $result['details'] ?? null,
            ], $result['status'] ?? 500);
        }
        Log::info('Received calculation result for: ' . print_r($result, true));

        $recipeNodes = $result['recipeNodeArr'] ?? [];
        $ingredientsData = $result['ingredientsData'] ?? [
            'input' => [],
            'intermediate' => [],
            'output' => [],
            'byproduct' => [],
        ];
        $recipeOptions = $result['recipeOptions'] ?? [];

        return response()->json([
            "recipeNodeArr" => $recipeNodes,
            "ingredientsData" => $ingredientsData,
            "recipeOptions" => $recipeOptions,
            "alternateRecipeMeta" => $this->buildAlternateRecipeMeta($recipeOptions),
            "statistics" => $result['statistics'] ?? []
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
            return response()->json([
                'error' => $result['error'],
                'userMessage' => $result['userMessage'] ?? null,
                'details' => $result['details'] ?? null,
            ], $result['status'] ?? 500);
        }

        $ingredientsData = $result['ingredientsData'] ?? [
            'input' => [],
            'intermediate' => [],
            'output' => [],
            'byproduct' => [],
        ];
        $baseIngredients = $ingredientsData['input'] ?? [];
        $recipeOptions = $result['recipeOptions'] ?? [];

        return response()->json([
            'item' => $item,
            'baseIngredients' => $baseIngredients,
            'recipeOptions' => $recipeOptions,
            'alternateRecipeMeta' => $this->buildAlternateRecipeMeta($recipeOptions),
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
            return response()->json([
                'error' => $boundedResult['error'],
                'userMessage' => $boundedResult['userMessage'] ?? null,
                'details' => $boundedResult['details'] ?? null,
            ], $boundedResult['status'] ?? 500);
        }

        $recipeNodes = $boundedResult['recipeNodeArr'] ?? [];
        $ingredientsData = $boundedResult['ingredientsData'] ?? [
            'input' => [],
            'intermediate' => [],
            'output' => [],
            'byproduct' => [],
        ];
        $recipeOptions = $boundedResult['recipeOptions'] ?? [];

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
            'recipeOptions' => $recipeOptions,
            'alternateRecipeMeta' => $this->buildAlternateRecipeMeta($recipeOptions),
            'statistics' => $boundedResult['statistics'] ?? [],
        ], 200);
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
            $json = $response->json();
            if (is_array($json)) {
                return [
                    'error' => $json['error'] ?? 'Calculation failed.',
                    'userMessage' => $json['userMessage'] ?? null,
                    'details' => $json['details'] ?? null,
                    'status' => $response->status() ?: 500,
                ];
            }

            return ['error' => $response->body(), 'status' => $response->status() ?: 500];
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

    protected function normalizeRecipeName(string $name): string {
        return SatisfactoryAlternateRecipeStore::normalizeRecipeName($name);
    }

    protected function buildAlternateRecipeMeta(array $recipeOptions): array {
        if (!count($recipeOptions)) {
            return [];
        }

        $recipeNames = [];
        foreach ($recipeOptions as $options) {
            if (!is_array($options)) {
                continue;
            }
            foreach ($options as $recipeName) {
                if (!is_string($recipeName) || trim($recipeName) === '') {
                    continue;
                }
                $recipeNames[] = trim($recipeName);
            }
        }

        if (!count($recipeNames)) {
            return [];
        }

        $lookup = $this->alternateRecipeStore->getLookup();

        $meta = [];
        foreach ($recipeNames as $recipeName) {
            $normalized = $this->normalizeRecipeName($recipeName);
            $record = $lookup[$normalized] ?? null;
            if (!$record) {
                continue;
            }
            $meta[$recipeName] = [
                'itemName' => $record['itemName'] ?? '',
                'recipeName' => $record['recipeName'] ?? $recipeName,
                'resourceSaving' => $record['resourceSaving'] ?? null,
                'powerSaving' => $record['powerSaving'] ?? null,
                'spaceSaving' => $record['spaceSaving'] ?? null,
                'lessComplex' => $record['lessComplex'] ?? null,
                'description' => $record['description'] ?? null,
                'sourceUrl' => $record['sourceUrl'] ?? null,
            ];
        }

        return $meta;
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
