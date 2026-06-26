<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

final class SfmdMapTranslationTest extends TestCase
{
    private const FIXTURE_PATH = __DIR__.'/../Fixtures/modeler.sfmd';

    public function test_reference_fixture_captures_the_sfmd_shapes_we_need_to_support(): void
    {
        $fixture = $this->loadReferenceFixture();

        $this->assertSame('1.0', $fixture['Version'] ?? null);
        $this->assertArrayHasKey('Solver', $fixture);
        $this->assertArrayHasKey('Zoom', $fixture);
        $this->assertArrayHasKey('PanX', $fixture);
        $this->assertArrayHasKey('PanY', $fixture);
        $this->assertArrayHasKey('Outpost', $fixture);
        $this->assertArrayHasKey('Data', $fixture);
        $this->assertIsArray($fixture['Data']);
        $this->assertNotEmpty($fixture['Data']);

        $nodes = $fixture['Data'];
        $outposts = array_values(array_filter(
            $nodes,
            static fn (array $node): bool => ($node['Name'] ?? null) === 'Outpost'
        ));

        $this->assertNotEmpty($outposts, 'The reference export should contain outposts.');
        $this->assertTrue($this->hasNodeWithKey($nodes, 'X'));
        $this->assertTrue($this->hasNodeWithKey($nodes, 'Y'));
        $this->assertTrue($this->hasNodeWithKey($nodes, 'Inputs'));
        $this->assertTrue($this->hasNodeWithKey($nodes, 'Max'));
        $this->assertTrue($this->hasNodeWithKey($nodes, 'ShowPpm'));
        $this->assertTrue($this->hasNodeWithKey($nodes, 'ClockSpeed'));
        $this->assertTrue($this->hasNodeWithKey($outposts, 'InteriorInputs'));
        $this->assertTrue($this->hasRootOutpost($outposts));
        $this->assertTrue($this->hasNestedOutpost($outposts));
        $this->assertTrue($this->hasListStyleInputs($nodes));
        $this->assertTrue($this->hasNamedInputs($nodes));
    }

    public function test_project_map_export_will_emit_workspace_metadata_and_active_outpost(): void
    {
        $projectMap = $this->sampleProjectMap();
        $reference = $this->loadReferenceFixture();

        $this->markTestIncomplete(implode("\n", [
            'Implement the project-to-SFMD export transformer.',
            'This test should verify that root view state is exported to Version/Solver/Zoom/PanX/PanY/Outpost.',
            'Internal ids can stay internal in the project model and be mapped only in the SFMD layer.',
            'Expected source keys in the project map: '.implode(', ', array_keys($projectMap)),
            'Reference fixture keys: '.implode(', ', array_keys($reference)),
        ]));
    }

    public function test_project_map_export_will_map_outposts_to_nested_canvases_with_boundary_ports(): void
    {
        $projectMap = $this->sampleProjectMap();

        $this->assertArrayHasKey('outpost_ports', $projectMap);

        $this->markTestIncomplete(implode("\n", [
            'Implement outpost export/import mapping.',
            'This test should verify that project outposts map to Name=Outpost nodes with Title, Parent, Zoom, PanX and PanY.',
            'Project boundary port definitions should map to Inputs and InteriorInputs without changing the internal project schema.',
            'At least one assertion should cover nested outposts and at least one should cover a root outpost.',
        ]));
    }

    public function test_project_map_export_will_preserve_building_positions_and_optional_sfmd_fields(): void
    {
        $projectMap = $this->sampleProjectMap();

        $this->assertArrayHasKey('nodes', $projectMap);
        $this->assertNotEmpty($projectMap['nodes']);

        $this->markTestIncomplete(implode("\n", [
            'Implement node field mapping for SFMD export.',
            'This test should verify x/y position export for every building node.',
            'When available, existing project fields should be mapped to SFMD fields such as Parent, Max, ShowPpm and ClockSpeed.',
            'Building kind/name mapping should cover recipes plus non-recipe buildings like splitters, mergers, storage, depots, sinks, generators and outposts.',
        ]));
    }

    public function test_project_map_import_will_translate_sfmd_back_into_project_data_without_renaming_internal_fields(): void
    {
        $fixture = $this->loadReferenceFixture();

        $this->assertIsArray($fixture['Data'] ?? null);

        $this->markTestIncomplete(implode("\n", [
            'Implement the SFMD import transformer.',
            'This test should verify that SFMD Parent is mapped into the project containment field without forcing the project to rename parent_id.',
            'This test should verify that ClockSpeed, Max and ShowPpm are mapped into existing project concepts when they exist.',
            'It should also verify that SFMD positional routing data is preserved in the project edge model for later re-export.',
        ]));
    }

    public function test_project_map_can_round_trip_through_sfmd_without_losing_outpost_structure(): void
    {
        $this->markTestIncomplete(implode("\n", [
            'Add a round-trip contract once import/export transformers exist.',
            'Export project map -> parse SFMD -> import back into project map -> export again.',
            'Assert that outpost hierarchy, boundary ports, building positions, active outpost selection and mapped optional fields survive the round trip.',
        ]));
    }

    /**
     * @return array<string, mixed>
     */
    private function loadReferenceFixture(): array
    {
        $json = file_get_contents(self::FIXTURE_PATH);
        $this->assertNotFalse($json, 'Failed to read the SFMD reference fixture.');

        $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        $this->assertIsArray($decoded);

        return $decoded;
    }

    /**
     * This is only a sketch of the source shape the future transformer should accept.
     *
     * @return array<string, mixed>
     */
    private function sampleProjectMap(): array
    {
        return [
            'view' => [
                'zoom' => 1.0,
                'pan_x' => 0,
                'pan_y' => 0,
                'active_outpost_id' => 'root-outpost',
            ],
            'nodes' => [
                [
                    'id' => 'root-outpost',
                    'kind' => 'outpost',
                    'title' => 'Root Outpost',
                    'x' => -240,
                    'y' => -120,
                    'parent_id' => null,
                    'zoom' => 1.0,
                    'pan_x' => 0,
                    'pan_y' => 0,
                ],
                [
                    'id' => 'splitter-a',
                    'kind' => 'priority_splitter',
                    'name' => 'Priority Splitter',
                    'x' => 80,
                    'y' => -60,
                    'parent_id' => 'root-outpost',
                    'show_ppm' => false,
                ],
                [
                    'id' => 'plate-line-a',
                    'kind' => 'recipe',
                    'name' => 'Stitched Iron Plate',
                    'x' => 240,
                    'y' => -80,
                    'parent_id' => 'root-outpost',
                    'max' => '9',
                    'clock_speed' => '100',
                ],
            ],
            'edges' => [
                [
                    'from_node_id' => 'splitter-a',
                    'from_port' => 0,
                    'to_node_id' => 'plate-line-a',
                    'to_port' => 'Iron Plate',
                    'waypoints' => [
                        [150, -75],
                    ],
                ],
            ],
            'outpost_ports' => [
                [
                    'outpost_id' => 'root-outpost',
                    'direction' => 'input',
                    'port_index' => 0,
                    'source_node_id' => 'steel-block',
                    'source_port' => 0,
                ],
                [
                    'outpost_id' => 'root-outpost',
                    'direction' => 'output',
                    'port_index' => 0,
                    'internal_node_id' => 'plate-line-a',
                    'internal_port' => 0,
                ],
            ],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $nodes
     */
    private function hasNodeWithKey(array $nodes, string $key): bool
    {
        foreach ($nodes as $node) {
            if (array_key_exists($key, $node)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, array<string, mixed>>  $outposts
     */
    private function hasRootOutpost(array $outposts): bool
    {
        foreach ($outposts as $node) {
            if (!array_key_exists('Parent', $node)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, array<string, mixed>>  $outposts
     */
    private function hasNestedOutpost(array $outposts): bool
    {
        foreach ($outposts as $node) {
            if (array_key_exists('Parent', $node)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, array<string, mixed>>  $nodes
     */
    private function hasListStyleInputs(array $nodes): bool
    {
        foreach ($nodes as $node) {
            if (!array_key_exists('Inputs', $node) || !is_array($node['Inputs'])) {
                continue;
            }

            if (array_is_list($node['Inputs'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, array<string, mixed>>  $nodes
     */
    private function hasNamedInputs(array $nodes): bool
    {
        foreach ($nodes as $node) {
            if (!array_key_exists('Inputs', $node) || !is_array($node['Inputs'])) {
                continue;
            }

            if (!array_is_list($node['Inputs'])) {
                return true;
            }
        }

        return false;
    }
}
