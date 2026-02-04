<?php

namespace App\Console\Commands;

use App\Services\SatisfactoryAlternateRecipeStore;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class SyncSatisfactoryAlternateRecipesCommand extends Command
{
    protected $signature = 'satisfactory:sync-alternate-recipes
        {--url=https://satisfactory.fandom.com/wiki/Hard_Drive/Alternate_recipe_analysis : Source URL}
        {--dry-run : Parse and report without writing JSON file}';

    protected $description = 'Fetch and persist Satisfactory alternate recipe analysis into a local JSON file.';

    public function __construct(private readonly SatisfactoryAlternateRecipeStore $store)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $sourceUrl = (string) $this->option('url');
        $dryRun = (bool) $this->option('dry-run');

        $this->info("Fetching alternate recipes from: {$sourceUrl}");
        $response = Http::timeout(40)
            ->withHeaders(['User-Agent' => 'Hub Recipe Sync/1.0'])
            ->get($sourceUrl);

        if ($response->failed()) {
            $this->error("Failed to fetch source page. HTTP {$response->status()}");
            return self::FAILURE;
        }

        try {
            $rows = $this->extractRowsFromHtml($response->body(), $sourceUrl);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());
            return self::FAILURE;
        }

        if (!count($rows)) {
            $this->warn('No rows were parsed from the source table.');
            return self::FAILURE;
        }

        $this->line(sprintf('Parsed %d alternate recipes.', count($rows)));
        if ($dryRun) {
            $preview = array_slice($rows, 0, 10);
            $this->table(
                ['Item', 'Recipe', 'Resource', 'Power', 'Space', 'Less Complex', 'Description'],
                array_map(function (array $row): array {
                    return [
                        $row['itemName'],
                        $row['recipeName'],
                        $this->boolToText($row['resourceSaving']),
                        $this->boolToText($row['powerSaving']),
                        $this->boolToText($row['spaceSaving']),
                        $this->boolToText($row['lessComplex']),
                        $row['description'] ?: '-',
                    ];
                }, $preview)
            );
            $this->info('Dry run complete. No file changes were made.');
            return self::SUCCESS;
        }

        $this->store->saveRows($rows, $sourceUrl);
        $this->info(sprintf('Sync complete. Saved %d rows to %s', count($rows), $this->store->absolutePath()));

        return self::SUCCESS;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function extractRowsFromHtml(string $html, string $sourceUrl): array
    {
        $dom = new \DOMDocument();
        libxml_use_internal_errors(true);
        $loaded = $dom->loadHTML($html);
        libxml_clear_errors();

        if (!$loaded) {
            throw new RuntimeException('Failed to parse HTML from source page.');
        }

        $xpath = new \DOMXPath($dom);
        $table = $xpath->query('//table[contains(@class,"wikitable")]')->item(0);
        if (!$table) {
            throw new RuntimeException('Alternate recipe table was not found on source page.');
        }

        $headerIndexes = $this->resolveHeaderIndexes($xpath, $table);
        $rows = $xpath->query('.//tr[position() > 1]', $table);
        $currentItem = null;
        $byRecipeKey = [];

        foreach ($rows as $row) {
            $cells = $xpath->query('./th|./td', $row);
            if (!$cells || $cells->length < 2) {
                continue;
            }

            $itemCell = $cells->item($headerIndexes['item']);
            $recipeCell = $cells->item($headerIndexes['recipe_name']);

            $itemName = $this->extractItemNameFromCell($xpath, $itemCell);
            if (!$itemName) {
                $itemName = $currentItem;
            }
            if ($itemName) {
                $currentItem = $itemName;
            }

            $recipeName = $this->extractCellText($recipeCell);
            if (!$recipeName) {
                continue;
            }

            $resourceSaving = $this->parseBoolCell($cells->item($headerIndexes['resource_saving'])?->textContent ?? '');
            $powerSaving = $this->parseBoolCell($cells->item($headerIndexes['power_saving'])?->textContent ?? '');
            $spaceSaving = $this->parseBoolCell($cells->item($headerIndexes['space_saving'])?->textContent ?? '');
            $lessComplex = $this->parseBoolCell($cells->item($headerIndexes['less_complex'])?->textContent ?? '');
            $description = $this->extractCellText($cells->item($headerIndexes['description']));
            $normalizedRecipeName = SatisfactoryAlternateRecipeStore::normalizeRecipeName($recipeName);

            if (!isset($byRecipeKey[$normalizedRecipeName])) {
                $byRecipeKey[$normalizedRecipeName] = [
                    'itemName' => $itemName ?: '',
                    'recipeName' => $recipeName,
                    'resourceSaving' => $resourceSaving,
                    'powerSaving' => $powerSaving,
                    'spaceSaving' => $spaceSaving,
                    'lessComplex' => $lessComplex,
                    'description' => $description ?: null,
                    'sourceUrl' => $sourceUrl,
                ];
                continue;
            }

            $existing = $byRecipeKey[$normalizedRecipeName];
            $byRecipeKey[$normalizedRecipeName] = [
                'itemName' => $existing['itemName'] ?: ($itemName ?: ''),
                'recipeName' => $existing['recipeName'] ?: $recipeName,
                'resourceSaving' => $existing['resourceSaving'] ?? $resourceSaving,
                'powerSaving' => $existing['powerSaving'] ?? $powerSaving,
                'spaceSaving' => $existing['spaceSaving'] ?? $spaceSaving,
                'lessComplex' => $existing['lessComplex'] ?? $lessComplex,
                'description' => $existing['description'] ?: ($description ?: null),
                'sourceUrl' => $sourceUrl,
            ];
        }

        return array_values($byRecipeKey);
    }

    /**
     * @return array{item:int, recipe_name:int, resource_saving:int, power_saving:int, space_saving:int, less_complex:int, description:int}
     */
    protected function resolveHeaderIndexes(\DOMXPath $xpath, \DOMNode $table): array
    {
        $headerRow = $xpath->query('.//tr[1]', $table)->item(0);
        if (!$headerRow) {
            throw new RuntimeException('Failed to locate header row in alternate recipe table.');
        }

        $headerCells = $xpath->query('./th', $headerRow);
        if (!$headerCells || !$headerCells->length) {
            throw new RuntimeException('Failed to parse headers in alternate recipe table.');
        }

        $map = [];
        foreach ($headerCells as $index => $cell) {
            $header = $this->normalizeHeaderKey($cell->textContent);
            $map[$header] = $index;
        }

        $required = [
            'item' => 'item',
            'recipe_name' => 'recipename',
            'resource_saving' => 'resourcesaving',
            'power_saving' => 'powersaving',
            'space_saving' => 'spacesaving',
            'less_complex' => 'lesscomplex',
            'description' => 'comborecipesremarks',
        ];

        $indexes = [];
        foreach ($required as $key => $header) {
            if (!array_key_exists($header, $map)) {
                throw new RuntimeException("Expected header \"{$header}\" was not found in alternate recipe table.");
            }
            $indexes[$key] = $map[$header];
        }

        return $indexes;
    }

    protected function normalizeHeaderKey(string $value): string
    {
        $value = mb_strtolower(trim($value));
        return preg_replace('/[^a-z]/', '', $value);
    }

    protected function extractItemNameFromCell(\DOMXPath $xpath, ?\DOMNode $cell): ?string
    {
        if (!$cell) {
            return null;
        }

        $anchors = $xpath->query('.//a[@title]', $cell);
        if ($anchors && $anchors->length) {
            foreach ($anchors as $anchor) {
                $title = trim((string) $anchor->attributes?->getNamedItem('title')?->nodeValue);
                if ($title !== '') {
                    return $title;
                }
            }
        }

        $text = $this->extractCellText($cell);
        return $text !== '' ? $text : null;
    }

    protected function extractCellText(?\DOMNode $cell): string
    {
        if (!$cell) {
            return '';
        }
        $text = preg_replace('/\s+/', ' ', trim($cell->textContent));
        return trim((string) $text);
    }

    protected function parseBoolCell(string $value): ?bool
    {
        $normalized = mb_strtolower(trim($value));
        return match ($normalized) {
            'yes' => true,
            'no' => false,
            default => null,
        };
    }

    protected function boolToText(?bool $value): string
    {
        if ($value === true) {
            return 'Yes';
        }
        if ($value === false) {
            return 'No';
        }
        return '-';
    }
}
