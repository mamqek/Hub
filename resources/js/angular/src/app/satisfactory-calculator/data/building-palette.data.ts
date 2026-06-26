import { BoardNodeKind } from '../types/factory-model.types';

export type BuildingPaletteCategoryId =
    | 'extraction'
    | 'production'
    | 'logistics'
    | 'storage'
    | 'power';

export interface BuildingPaletteCategory {
    id: BuildingPaletteCategoryId;
    title: string;
}

export interface BuildingPaletteItem {
    id: string;
    label: string;
    machineName: string;
    kind: BoardNodeKind;
    categoryId: BuildingPaletteCategoryId;
    imagePath: string | null;
}

export const BUILDING_PALETTE_CATEGORIES: BuildingPaletteCategory[] = [
    { id: 'extraction', title: 'Extraction' },
    { id: 'production', title: 'Production' },
    { id: 'logistics', title: 'Logistics' },
    { id: 'storage', title: 'Storage & Sink' },
    { id: 'power', title: 'Power' },
];

export const BUILDING_PALETTE_ITEMS: BuildingPaletteItem[] = [
    {
        id: 'miner-mk1',
        label: 'Miner Mk.1',
        machineName: 'Miner Mk.1',
        kind: 'extractor',
        categoryId: 'extraction',
        imagePath: 'images/Miner_Mk1.webp',
    },
    {
        id: 'miner-mk2',
        label: 'Miner Mk.2',
        machineName: 'Miner Mk.2',
        kind: 'extractor',
        categoryId: 'extraction',
        imagePath: 'images/Miner_Mk2.webp',
    },
    {
        id: 'miner-mk3',
        label: 'Miner Mk.3',
        machineName: 'Miner Mk.3',
        kind: 'extractor',
        categoryId: 'extraction',
        imagePath: 'images/Miner_Mk3.webp',
    },
    {
        id: 'water-extractor',
        label: 'Water Extractor',
        machineName: 'Water Extractor',
        kind: 'extractor',
        categoryId: 'extraction',
        imagePath: null,
    },
    {
        id: 'oil-extractor',
        label: 'Oil Extractor',
        machineName: 'Oil Extractor',
        kind: 'extractor',
        categoryId: 'extraction',
        imagePath: 'images/Oil_Extractor.webp',
    },
    {
        id: 'resource-well-pressurizer',
        label: 'Resource Well Pressurizer',
        machineName: 'Resource Well Pressurizer',
        kind: 'extractor',
        categoryId: 'extraction',
        imagePath: null,
    },
    {
        id: 'resource-well-extractor',
        label: 'Resource Well Extractor',
        machineName: 'Resource Well Extractor',
        kind: 'extractor',
        categoryId: 'extraction',
        imagePath: null,
    },
    {
        id: 'smelter',
        label: 'Smelter',
        machineName: 'Smelter',
        kind: 'recipe',
        categoryId: 'production',
        imagePath: 'images/Smelter.webp',
    },
    {
        id: 'constructor',
        label: 'Constructor',
        machineName: 'Constructor',
        kind: 'recipe',
        categoryId: 'production',
        imagePath: 'images/Constructor.webp',
    },
    {
        id: 'assembler',
        label: 'Assembler',
        machineName: 'Assembler',
        kind: 'recipe',
        categoryId: 'production',
        imagePath: 'images/Assembler.webp',
    },
    {
        id: 'foundry',
        label: 'Foundry',
        machineName: 'Foundry',
        kind: 'recipe',
        categoryId: 'production',
        imagePath: 'images/Foundry.webp',
    },
    {
        id: 'manufacturer',
        label: 'Manufacturer',
        machineName: 'Manufacturer',
        kind: 'recipe',
        categoryId: 'production',
        imagePath: 'images/Manufacturer.webp',
    },
    {
        id: 'refinery',
        label: 'Refinery',
        machineName: 'Refinery',
        kind: 'recipe',
        categoryId: 'production',
        imagePath: 'images/Refinery.webp',
    },
    {
        id: 'blender',
        label: 'Blender',
        machineName: 'Blender',
        kind: 'recipe',
        categoryId: 'production',
        imagePath: 'images/Blender.webp',
    },
    {
        id: 'packager',
        label: 'Packager',
        machineName: 'Packager',
        kind: 'recipe',
        categoryId: 'production',
        imagePath: 'images/Packager.webp',
    },
    {
        id: 'particle-accelerator',
        label: 'Particle Accelerator',
        machineName: 'Particle Accelerator',
        kind: 'recipe',
        categoryId: 'production',
        imagePath: null,
    },
    {
        id: 'quantum-encoder',
        label: 'Quantum Encoder',
        machineName: 'Quantum Encoder',
        kind: 'recipe',
        categoryId: 'production',
        imagePath: null,
    },
    {
        id: 'converter',
        label: 'Converter',
        machineName: 'Converter',
        kind: 'recipe',
        categoryId: 'production',
        imagePath: null,
    },
    {
        id: 'conveyor-splitter',
        label: 'Conveyor Splitter',
        machineName: 'Conveyor Splitter',
        kind: 'splitter',
        categoryId: 'logistics',
        imagePath: null,
    },
    {
        id: 'smart-splitter',
        label: 'Smart Splitter',
        machineName: 'Smart Splitter',
        kind: 'splitter',
        categoryId: 'logistics',
        imagePath: 'images/Smart_Splitter.webp',
    },
    {
        id: 'programmable-splitter',
        label: 'Programmable Splitter',
        machineName: 'Programmable Splitter',
        kind: 'splitter',
        categoryId: 'logistics',
        imagePath: null,
    },
    {
        id: 'conveyor-merger',
        label: 'Conveyor Merger',
        machineName: 'Conveyor Merger',
        kind: 'merger',
        categoryId: 'logistics',
        imagePath: null,
    },
    {
        id: 'pipeline-junction-cross',
        label: 'Pipeline Junction Cross',
        machineName: 'Pipeline Junction Cross',
        kind: 'junction',
        categoryId: 'logistics',
        imagePath: null,
    },
    {
        id: 'storage-container',
        label: 'Storage Container',
        machineName: 'Storage Container',
        kind: 'storage',
        categoryId: 'storage',
        imagePath: null,
    },
    {
        id: 'industrial-storage-container',
        label: 'Industrial Storage Container',
        machineName: 'Industrial Storage Container',
        kind: 'storage',
        categoryId: 'storage',
        imagePath: null,
    },
    {
        id: 'fluid-buffer',
        label: 'Fluid Buffer',
        machineName: 'Fluid Buffer',
        kind: 'storage',
        categoryId: 'storage',
        imagePath: null,
    },
    {
        id: 'industrial-fluid-buffer',
        label: 'Industrial Fluid Buffer',
        machineName: 'Industrial Fluid Buffer',
        kind: 'storage',
        categoryId: 'storage',
        imagePath: null,
    },
    {
        id: 'dimensional-depot-uploader',
        label: 'Dimensional Depot Uploader',
        machineName: 'Dimensional Depot Uploader',
        kind: 'depot',
        categoryId: 'storage',
        imagePath: null,
    },
    {
        id: 'awesome-sink',
        label: 'AWESOME Sink',
        machineName: 'AWESOME Sink',
        kind: 'sink',
        categoryId: 'storage',
        imagePath: null,
    },
    {
        id: 'biomass-burner',
        label: 'Biomass Burner',
        machineName: 'Biomass Burner',
        kind: 'generator',
        categoryId: 'power',
        imagePath: null,
    },
    {
        id: 'coal-generator',
        label: 'Coal Generator',
        machineName: 'Coal Generator',
        kind: 'generator',
        categoryId: 'power',
        imagePath: 'images/Coal_Generator.webp',
    },
    {
        id: 'fuel-generator',
        label: 'Fuel Generator',
        machineName: 'Fuel Generator',
        kind: 'generator',
        categoryId: 'power',
        imagePath: null,
    },
    {
        id: 'nuclear-power-plant',
        label: 'Nuclear Power Plant',
        machineName: 'Nuclear Power Plant',
        kind: 'generator',
        categoryId: 'power',
        imagePath: null,
    },
    {
        id: 'geothermal-generator',
        label: 'Geothermal Generator',
        machineName: 'Geothermal Generator',
        kind: 'generator',
        categoryId: 'power',
        imagePath: null,
    },
    {
        id: 'power-storage',
        label: 'Power Storage',
        machineName: 'Power Storage',
        kind: 'power',
        categoryId: 'power',
        imagePath: null,
    },
];
