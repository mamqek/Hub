/**
 * Future-facing map/editor model for the satisfactory calculator board.
 *
 * This file is intentionally standalone for now.
 *
 * Main decisions captured here:
 * - recipe description is separate from board node placement
 * - graph connectivity is explicit through connections, not tree-only
 * - outposts are first-class containers that reference related node/edge ids
 * - board ids are stable string ids suitable for manual editing and export
 */

export type FactoryMapVersion = 1;

export type NodeId = string;
export type ConnectionId = string;
export type OutpostId = string;
export const ROOT_OUTPOST_ID: OutpostId = 'root';
export const ROOT_OUTPOST_TITLE = 'Main';

export type RatePerMinute = string;
export type BoardSide = 'left' | 'right' | 'top' | 'bottom';

export interface Point {
    x: number;
    y: number;
}

/**
 * Basic produced item payload used by recipes and connections.
 */
export interface ProducedItem {
    id?: NodeId;
    itemName: string;
    productionRate: RatePerMinute;
}

/**
 * A single item requirement inside a recipe definition.
 * `slotName` is useful once connections stop being hard-coded by array order.
 */
export interface RecipeIngredient extends ProducedItem {
    slotName?: string | null;
}

/**
 * Recipe definition only. This describes what a recipe does, not where it is
 * placed on the board.
 *
 * `machineName` is intentionally omitted here. In Satisfactory it has a close
 * relation to recipe choice, but for the board/editor model the selected
 * machine belongs to the placed node, not to the abstract recipe definition.
 */
export interface Recipe {
    recipeName?: string | null;
    itemName: string;
    productionRate: RatePerMinute;
    ingredients: RecipeIngredient[];
    byproducts: ProducedItem[];
    isBaseMaterial?: boolean;
}

export interface MachinePlacement {
    machineName?: string | null;
    machineCount?: number | null;
    clockSpeed?: string | null;
    max?: string | null;
    showPpm?: boolean;
}

export type BoardNodeKind =
    | 'recipe'
    | 'splitter'
    | 'merger'
    | 'storage'
    | 'depot'
    | 'sink'
    | 'generator'
    | 'extractor'
    | 'power'
    | 'junction'
    | 'decorator'
    | 'custom';

/**
 * A placed node on the board. This is the central structure that manual nodes
 * and generated recipe nodes should eventually share.
 */
export interface BoardNode {
    id: NodeId;
    kind: BoardNodeKind;
    label: string;
    itemName?: string | null;
    position: Point;
    parentOutpostId: OutpostId;
    recipe?: Recipe | null;
    machine?: MachinePlacement | null;
    cardColor?: string | null;
    metadata?: {
        notes?: string | null;
        selectedRecipeName?: string | null;
        solverIndentLevel?: number | null;
        tags?: string[];
    };
}

/**
 * Explicit connection model for the board graph.
 * This replaces the tree-only `ingredients` / `parentId` relationship.
 *
 * Side anchors can be derived automatically from positions, but leaving them
 * optional allows future manual overrides and easier import/export mapping.
 */
export interface BoardConnection {
    id: ConnectionId;
    fromNodeId: NodeId;
    toNodeId: NodeId;
    itemName?: string | null;
    productionRate?: RatePerMinute | null;
    fromSide?: BoardSide | null;
    toSide?: BoardSide | null;
    path?: Point[];
    metadata?: {
        priorityLane?: number | null;
        isManual?: boolean;
    };
}

export interface OutpostBoundaryPort {
    id: string;
    direction: 'input' | 'output';
    label?: string | null;
    linkedNodeId?: NodeId | null;
    side?: BoardSide | null;
}

/**
 * Outpost is a first-class container with its own local view state and
 * references to contained graph entities.
 *
 * It stores ids instead of nested nodes so it stays compatible with algorithm
 * output, manual editing, import/export, and future partial updates.
 */
export interface Outpost {
    id: OutpostId;
    title: string;
    parentOutpostId?: OutpostId | null;
    position: Point;
    view: {
        zoom: number;
        panX: number;
        panY: number;
    };
    nodeIds: NodeId[];
    connectionIds: ConnectionId[];
    childOutpostIds: OutpostId[];
    boundaryPorts: Record<string, OutpostBoundaryPort>;
    metadata?: {
        notes?: string | null;
    };
}

/**
 * Root board document.
 *
 * Nodes, connections, and outposts are keyed records rather than arrays to
 * make manual additions, id-based updates, and export/import mapping easier.
 */
export interface FactoryMap {
    version: FactoryMapVersion;
    rootOutpostId: OutpostId;
    activeOutpostId: OutpostId;
    nodes: Record<NodeId, BoardNode>;
    connections: Record<ConnectionId, BoardConnection>;
    outposts: Record<OutpostId, Outpost>;
    metadata?: {
        title?: string | null;
        generatedFromItem?: string | null;
    };
}
