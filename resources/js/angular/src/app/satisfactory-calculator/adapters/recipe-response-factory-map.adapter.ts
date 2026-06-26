import {
    BoardConnection,
    BoardNode,
    FactoryMap,
    Point,
    ROOT_OUTPOST_ID,
    ROOT_OUTPOST_TITLE,
} from '../types/factory-model.types';
import { ProducedItem, RecipeNode, RecipeResponse } from '../services/recipe.service';

export function adaptRecipeResponseToFactoryMap(
    response: RecipeResponse,
    existingBoard?: FactoryMap | null
): FactoryMap {
    return adaptRecipeNodesToFactoryMap(response?.recipeNodeArr ?? [], existingBoard, response);
}

export function adaptRecipeNodesToFactoryMap(
    nodes: RecipeNode[],
    existingBoard?: FactoryMap | null,
    response?: RecipeResponse | null
): FactoryMap {
    const existingNodes = existingBoard?.nodes ?? {};
    const existingConnections = existingBoard?.connections ?? {};
    const existingOutposts = clone(existingBoard?.outposts ?? {});
    const rootOutpostId = existingBoard?.rootOutpostId || ROOT_OUTPOST_ID;
    const nodeLookup = new Map(nodes.map((node) => [node.id, node]));
    const generatedNodeIds = new Set<string>();
    const mappedNodes: Record<string, BoardNode> = {};
    const mappedConnections: Record<string, BoardConnection> = {};

    for (const node of nodes) {
        const nodeId = `${node.id}`;
        generatedNodeIds.add(nodeId);
        const existingNode = existingNodes[nodeId];
        mappedNodes[nodeId] = {
            id: nodeId,
            kind: 'recipe',
            label: node.recipeName?.trim() || node.itemName,
            itemName: node.itemName,
            position: normalizePoint(existingNode?.position),
            parentOutpostId: existingNode?.parentOutpostId || rootOutpostId,
            recipe: {
                recipeName: node.recipeName ?? null,
                itemName: node.itemName,
                productionRate: node.productionRate,
                ingredients: (node.ingredients || [])
                    .map((childId) => nodeLookup.get(childId))
                    .filter((child): child is RecipeNode => Boolean(child))
                    .map((child) => ({
                        id: `${child.id}`,
                        itemName: child.itemName,
                        productionRate: child.productionRate,
                    })),
                byproducts: (node.byproducts || []).map((byproduct) => mapProducedItem(byproduct)),
                isBaseMaterial: node.isBaseMaterial,
            },
            machine: {
                machineName: node.machineName ?? null,
                machineCount: node.machineCount ?? null,
            },
            cardColor: node.cardColor ?? existingNode?.cardColor ?? null,
            metadata: {
                ...(clone(existingNode?.metadata ?? {})),
                selectedRecipeName: node.recipeName ?? null,
                solverIndentLevel: node.indentLevel ?? null,
                tags: mergeTags(existingNode?.metadata?.tags, ['solver-generated']),
            },
        };

        if (node.parentId === undefined) {
            continue;
        }

        const connectionId = `connection-${node.id}-${node.parentId}`;
        const existingConnection = existingConnections[connectionId];
        mappedConnections[connectionId] = {
            id: connectionId,
            fromNodeId: nodeId,
            toNodeId: `${node.parentId}`,
            itemName: node.itemName,
            productionRate: node.productionRate,
            fromSide: existingConnection?.fromSide ?? null,
            toSide: existingConnection?.toSide ?? null,
            path: existingConnection?.path?.map((point) => normalizePoint(point)),
            metadata: {
                ...(clone(existingConnection?.metadata ?? {})),
                isManual: false,
            },
        };
    }

    for (const [nodeId, node] of Object.entries(existingNodes)) {
        if (mappedNodes[nodeId] || isSolverGeneratedNode(nodeId, node)) {
            continue;
        }
        mappedNodes[nodeId] = clone(node);
    }

    for (const [connectionId, connection] of Object.entries(existingConnections)) {
        if (mappedConnections[connectionId]) {
            continue;
        }

        if (!mappedNodes[connection.fromNodeId] || !mappedNodes[connection.toNodeId]) {
            continue;
        }

        if (shouldPreserveConnection(connection, existingNodes, generatedNodeIds)) {
            mappedConnections[connectionId] = {
                ...clone(connection),
                id: connectionId,
                path: Array.isArray(connection.path)
                    ? connection.path.map((point) => normalizePoint(point))
                    : undefined,
            };
        }
    }

    const generatedFromItem = response?.ingredientsData?.output?.[0]?.itemName
        || nodes.find((node) => node.parentId === undefined)?.itemName
        || null;

    return {
        version: 1,
        rootOutpostId,
        activeOutpostId: existingBoard?.activeOutpostId || rootOutpostId,
        nodes: mappedNodes,
        connections: mappedConnections,
        outposts: buildOutposts(existingOutposts, rootOutpostId, mappedNodes, mappedConnections),
        metadata: {
            ...clone(existingBoard?.metadata ?? {}),
            generatedFromItem,
        },
    };
}

function mapProducedItem(item: ProducedItem) {
    return {
        ...(item.id ? { id: `${item.id}` } : {}),
        itemName: item.itemName,
        productionRate: item.productionRate,
    };
}

function buildOutposts(
    outposts: FactoryMap['outposts'],
    rootOutpostId: string,
    nodes: Record<string, BoardNode>,
    connections: Record<string, BoardConnection>
): FactoryMap['outposts'] {
    const originalOutposts = clone(outposts);
    const nextOutposts = clone(outposts);
    if (!nextOutposts[rootOutpostId]) {
        nextOutposts[rootOutpostId] = {
            id: rootOutpostId,
            title: ROOT_OUTPOST_TITLE,
            parentOutpostId: null,
            position: { x: 0, y: 0 },
            view: {
                zoom: 1,
                panX: 0,
                panY: 0,
            },
            nodeIds: [],
            connectionIds: [],
            childOutpostIds: [],
            boundaryPorts: {},
            metadata: {},
        };
    }

    for (const [outpostId, outpost] of Object.entries(nextOutposts)) {
        outpost.id = outpostId;
        outpost.nodeIds = [];
        outpost.connectionIds = [];
        outpost.childOutpostIds = [];
        outpost.position = normalizePoint(outpost.position);
        outpost.view = {
            zoom: outpost.view?.zoom ?? 1,
            panX: outpost.view?.panX ?? 0,
            panY: outpost.view?.panY ?? 0,
        };
        outpost.boundaryPorts = clone(outpost.boundaryPorts ?? {});
        outpost.metadata = clone(outpost.metadata ?? {});
    }

    nextOutposts[rootOutpostId].parentOutpostId = null;
    nextOutposts[rootOutpostId].title = nextOutposts[rootOutpostId].title || ROOT_OUTPOST_TITLE;

    for (const node of Object.values(nodes)) {
        if (!nextOutposts[node.parentOutpostId]) {
            throw new Error(`Node "${node.id}" references missing outpost "${node.parentOutpostId}".`);
        }
        nextOutposts[node.parentOutpostId].nodeIds.push(node.id);
    }

    for (const [outpostId, outpost] of Object.entries(nextOutposts)) {
        if (outpostId === rootOutpostId) {
            continue;
        }

        if (!outpost.parentOutpostId || !nextOutposts[outpost.parentOutpostId]) {
            throw new Error(`Outpost "${outpostId}" references missing parent outpost "${outpost.parentOutpostId}".`);
        }
        nextOutposts[outpost.parentOutpostId].childOutpostIds.push(outpostId);
    }

    const assignedConnections = new Set<string>();
    for (const [outpostId, outpost] of Object.entries(originalOutposts)) {
        if (!nextOutposts[outpostId]) {
            continue;
        }

        for (const connectionId of outpost.connectionIds || []) {
            if (!connections[connectionId] || assignedConnections.has(connectionId)) {
                continue;
            }

            nextOutposts[outpostId].connectionIds.push(connectionId);
            assignedConnections.add(connectionId);
        }
    }

    for (const connectionId of Object.keys(connections)) {
        if (!assignedConnections.has(connectionId)) {
            nextOutposts[rootOutpostId].connectionIds.push(connectionId);
        }
    }

    return nextOutposts;
}

function isSolverGeneratedNode(nodeId: string, node: BoardNode | undefined): boolean {
    if (!node) {
        return false;
    }

    if (node.metadata?.tags?.includes('solver-generated')) {
        return true;
    }

    return node.kind === 'recipe' && /^\d+$/.test(nodeId);
}

function shouldPreserveConnection(
    connection: BoardConnection,
    existingNodes: Record<string, BoardNode>,
    generatedNodeIds: Set<string>
): boolean {
    if (connection.metadata?.isManual) {
        return true;
    }

    const fromNode = existingNodes[connection.fromNodeId];
    const toNode = existingNodes[connection.toNodeId];
    const fromGenerated = generatedNodeIds.has(connection.fromNodeId) || isSolverGeneratedNode(connection.fromNodeId, fromNode);
    const toGenerated = generatedNodeIds.has(connection.toNodeId) || isSolverGeneratedNode(connection.toNodeId, toNode);

    return !(fromGenerated && toGenerated);
}

function normalizePoint(point: Point | null | undefined): Point {
    return {
        x: Number.isFinite(Number(point?.x)) ? Number(point?.x) : 0,
        y: Number.isFinite(Number(point?.y)) ? Number(point?.y) : 0,
    };
}

function mergeTags(existingTags: string[] | undefined, tagsToAdd: string[]): string[] {
    return Array.from(new Set([...(existingTags ?? []), ...tagsToAdd]));
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}
