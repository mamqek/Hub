<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

class SatisfactoryAlternateRecipeStore
{
    public const STORAGE_PATH = 'satisfactory/alternate_recipes.json';

    public static function normalizeRecipeName(string $value): string
    {
        $value = preg_replace('/\s+/', ' ', trim($value));
        return mb_strtolower($value);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public function getLookup(): array
    {
        if (!Storage::disk('local')->exists(self::STORAGE_PATH)) {
            return [];
        }

        $raw = Storage::disk('local')->get(self::STORAGE_PATH);
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return [];
        }

        $recipes = $decoded['recipes'] ?? [];
        return is_array($recipes) ? $recipes : [];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    public function saveRows(array $rows, string $sourceUrl): void
    {
        $lookup = [];
        foreach ($rows as $row) {
            $recipeName = isset($row['recipeName']) ? trim((string) $row['recipeName']) : '';
            if ($recipeName === '') {
                continue;
            }

            $normalized = self::normalizeRecipeName($recipeName);
            $lookup[$normalized] = [
                'itemName' => (string) ($row['itemName'] ?? ''),
                'recipeName' => $recipeName,
                'resourceSaving' => $row['resourceSaving'] ?? null,
                'powerSaving' => $row['powerSaving'] ?? null,
                'spaceSaving' => $row['spaceSaving'] ?? null,
                'lessComplex' => $row['lessComplex'] ?? null,
                'description' => $row['description'] ?? null,
                'sourceUrl' => $row['sourceUrl'] ?? $sourceUrl,
            ];
        }

        ksort($lookup);
        Storage::disk('local')->makeDirectory(dirname(self::STORAGE_PATH));
        Storage::disk('local')->put(
            self::STORAGE_PATH,
            json_encode(
                [
                    'generatedAt' => now()->toIso8601String(),
                    'sourceUrl' => $sourceUrl,
                    'count' => count($lookup),
                    'recipes' => $lookup,
                ],
                JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
            )
        );
    }

    public function absolutePath(): string
    {
        return storage_path('app/' . self::STORAGE_PATH);
    }
}

