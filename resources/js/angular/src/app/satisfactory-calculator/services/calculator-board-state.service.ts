import { Injectable } from '@angular/core';

import {
    BoardNode,
    ConnectionId,
    FactoryMap,
    NodeId,
    Outpost,
    OutpostId,
    Point,
    ROOT_OUTPOST_ID,
    ROOT_OUTPOST_TITLE,
} from '../types/factory-model.types';
import { SessionStoreService } from './session-store.service';

export type BoardId = string;

export interface CalculatorBoardStateStore {
    version: 1;
    activeBoardId: BoardId | null;
    boards: Record<BoardId, FactoryMap>;
}

const BOARD_STATE_STORE_KEY = 'calculator.board-state';

@Injectable({ providedIn: 'root' })
export class CalculatorBoardStateService {
    constructor(private sessionStore: SessionStoreService) {}

    createBoard(initialMap?: FactoryMap, preferredBoardId?: BoardId): BoardId {
        const store = this.readStore();
        const boardId = this.resolveBoardId(store, preferredBoardId);
        const board = this.clone(initialMap ?? this.createEmptyBoard());
        this.assertBoard(board);
        store.boards[boardId] = board;
        store.activeBoardId = boardId;
        this.writeStore(store);
        return boardId;
    }

    getBoard(boardId: BoardId): FactoryMap | null {
        const board = this.readStore().boards[boardId];
        return board ? this.clone(board) : null;
    }

    getActiveBoardId(): BoardId | null {
        return this.readStore().activeBoardId;
    }

    getActiveBoard(): FactoryMap | null {
        const store = this.readStore();
        return store.activeBoardId && store.boards[store.activeBoardId]
            ? this.clone(store.boards[store.activeBoardId])
            : null;
    }

    setActiveBoard(boardId: BoardId): boolean {
        const store = this.readStore();
        if (!store.boards[boardId]) {
            return false;
        }

        store.activeBoardId = boardId;
        this.writeStore(store);
        return true;
    }

    saveBoard(boardId: BoardId, board: FactoryMap): FactoryMap {
        const store = this.readStore();
        const nextBoard = this.clone(board);
        this.assertBoard(nextBoard);
        store.boards[boardId] = nextBoard;
        store.activeBoardId = boardId;
        this.writeStore(store);
        return this.clone(nextBoard);
    }

    addNode(boardId: BoardId, node: BoardNode, outpostId?: OutpostId): FactoryMap | null {
        const store = this.readStore();
        const board = store.boards[boardId];
        if (!board) {
            return null;
        }

        const nextBoard = this.clone(board);
        const targetOutpostId = this.requireOutpostId(nextBoard, outpostId ?? node.parentOutpostId ?? nextBoard.activeOutpostId);
        if (nextBoard.nodes[node.id]) {
            throw new Error(`Node "${node.id}" already exists on board "${boardId}".`);
        }

        nextBoard.nodes[node.id] = {
            ...this.clone(node),
            parentOutpostId: targetOutpostId,
        };
        nextBoard.outposts[targetOutpostId].nodeIds.push(node.id);
        this.assertBoard(nextBoard);

        store.boards[boardId] = nextBoard;
        store.activeBoardId = boardId;
        this.writeStore(store);
        return this.clone(nextBoard);
    }

    updateNode(boardId: BoardId, nodeId: NodeId, patch: Partial<BoardNode>): FactoryMap | null {
        const store = this.readStore();
        const board = store.boards[boardId];
        if (!board) {
            return null;
        }

        const nextBoard = this.clone(board);
        const existingNode = nextBoard.nodes[nodeId];
        if (!existingNode) {
            return null;
        }

        const targetOutpostId = patch.parentOutpostId === undefined
            ? existingNode.parentOutpostId
            : this.requireOutpostId(nextBoard, patch.parentOutpostId);

        nextBoard.nodes[nodeId] = {
            ...existingNode,
            ...this.clone(patch),
            id: existingNode.id,
            parentOutpostId: targetOutpostId,
        };

        if (existingNode.parentOutpostId !== targetOutpostId) {
            this.removeValue(nextBoard.outposts[existingNode.parentOutpostId].nodeIds, nodeId);
            nextBoard.outposts[targetOutpostId].nodeIds.push(nodeId);
        }

        this.assertBoard(nextBoard);
        store.boards[boardId] = nextBoard;
        store.activeBoardId = boardId;
        this.writeStore(store);
        return this.clone(nextBoard);
    }

    updateNodePosition(boardId: BoardId, nodeId: NodeId, position: Point): FactoryMap | null {
        return this.updateNode(boardId, nodeId, {
            position,
        });
    }

    removeNode(boardId: BoardId, nodeId: NodeId): FactoryMap | null {
        const store = this.readStore();
        const board = store.boards[boardId];
        if (!board || !board.nodes[nodeId]) {
            return null;
        }

        const nextBoard = this.clone(board);
        const removedNode = nextBoard.nodes[nodeId];
        delete nextBoard.nodes[nodeId];
        this.removeValue(nextBoard.outposts[removedNode.parentOutpostId].nodeIds, nodeId);

        for (const connectionId of Object.keys(nextBoard.connections)) {
            const connection = nextBoard.connections[connectionId];
            if (connection.fromNodeId === nodeId || connection.toNodeId === nodeId) {
                delete nextBoard.connections[connectionId];
                for (const outpost of Object.values(nextBoard.outposts)) {
                    this.removeValue(outpost.connectionIds, connectionId);
                }
            }
        }

        for (const outpost of Object.values(nextBoard.outposts)) {
            for (const boundaryPort of Object.values(outpost.boundaryPorts || {})) {
                if (boundaryPort.linkedNodeId === nodeId) {
                    boundaryPort.linkedNodeId = null;
                }
            }
        }

        this.assertBoard(nextBoard);
        store.boards[boardId] = nextBoard;
        store.activeBoardId = boardId;
        this.writeStore(store);
        return this.clone(nextBoard);
    }

    generateBoardId(): BoardId {
        return this.generateScopedId('board');
    }

    generateNodeId(): NodeId {
        return this.generateScopedId('node');
    }

    generateConnectionId(): ConnectionId {
        return this.generateScopedId('connection');
    }

    generateOutpostId(): OutpostId {
        return this.generateScopedId('outpost');
    }

    private createEmptyBoard(): FactoryMap {
        return {
            version: 1,
            rootOutpostId: ROOT_OUTPOST_ID,
            activeOutpostId: ROOT_OUTPOST_ID,
            nodes: {},
            connections: {},
            outposts: {
                [ROOT_OUTPOST_ID]: this.createDefaultOutpost(ROOT_OUTPOST_ID, ROOT_OUTPOST_TITLE, null),
            },
            metadata: {},
        };
    }

    private createDefaultOutpost(id: OutpostId, title: string, parentOutpostId: OutpostId | null): Outpost {
        return {
            id,
            title,
            parentOutpostId,
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

    private assertBoard(board: FactoryMap): void {
        if (!board.outposts[board.rootOutpostId]) {
            throw new Error(`Board root outpost "${board.rootOutpostId}" does not exist.`);
        }

        if (!board.outposts[board.activeOutpostId]) {
            throw new Error(`Board active outpost "${board.activeOutpostId}" does not exist.`);
        }

        for (const [outpostId, outpost] of Object.entries(board.outposts)) {
            if (outpostId === board.rootOutpostId) {
                continue;
            }

            if (!outpost.parentOutpostId || !board.outposts[outpost.parentOutpostId]) {
                throw new Error(`Outpost "${outpostId}" has an invalid parent outpost.`);
            }
        }

        for (const [nodeId, node] of Object.entries(board.nodes)) {
            if (!board.outposts[node.parentOutpostId]) {
                throw new Error(`Node "${nodeId}" references missing outpost "${node.parentOutpostId}".`);
            }
        }

        for (const [connectionId, connection] of Object.entries(board.connections)) {
            if (!board.nodes[connection.fromNodeId]) {
                throw new Error(`Connection "${connectionId}" references missing source node "${connection.fromNodeId}".`);
            }
            if (!board.nodes[connection.toNodeId]) {
                throw new Error(`Connection "${connectionId}" references missing target node "${connection.toNodeId}".`);
            }
        }

        for (const [outpostId, outpost] of Object.entries(board.outposts)) {
            for (const nodeId of outpost.nodeIds) {
                if (!board.nodes[nodeId]) {
                    throw new Error(`Outpost "${outpostId}" references missing node "${nodeId}".`);
                }
                if (board.nodes[nodeId].parentOutpostId !== outpostId) {
                    throw new Error(`Outpost "${outpostId}" contains node "${nodeId}" that belongs to "${board.nodes[nodeId].parentOutpostId}".`);
                }
            }

            for (const connectionId of outpost.connectionIds) {
                if (!board.connections[connectionId]) {
                    throw new Error(`Outpost "${outpostId}" references missing connection "${connectionId}".`);
                }
            }

            for (const childOutpostId of outpost.childOutpostIds) {
                if (!board.outposts[childOutpostId]) {
                    throw new Error(`Outpost "${outpostId}" references missing child outpost "${childOutpostId}".`);
                }
                if (board.outposts[childOutpostId].parentOutpostId !== outpostId) {
                    throw new Error(`Outpost "${outpostId}" references child outpost "${childOutpostId}" with mismatched parent.`);
                }
            }
        }
    }

    private requireOutpostId(board: FactoryMap, outpostId: OutpostId): OutpostId {
        if (!board.outposts[outpostId]) {
            throw new Error(`Outpost "${outpostId}" does not exist on the current board.`);
        }
        return outpostId;
    }

    private removeValue<T>(items: T[], value: T): void {
        const index = items.indexOf(value);
        if (index >= 0) {
            items.splice(index, 1);
        }
    }

    private resolveBoardId(store: CalculatorBoardStateStore, preferredBoardId?: BoardId): BoardId {
        const trimmedPreferred = `${preferredBoardId || ''}`.trim();
        if (trimmedPreferred) {
            return trimmedPreferred;
        }

        let boardId = this.generateBoardId();
        while (store.boards[boardId]) {
            boardId = this.generateBoardId();
        }
        return boardId;
    }

    private generateScopedId(scope: string): string {
        return `${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    private readStore(): CalculatorBoardStateStore {
        const fallback: CalculatorBoardStateStore = {
            version: 1,
            activeBoardId: null,
            boards: {},
        };
        const stored = this.sessionStore.get<any>(BOARD_STATE_STORE_KEY, fallback);
        if (!stored || typeof stored !== 'object') {
            return fallback;
        }

        const boards = stored.boards && typeof stored.boards === 'object'
            ? this.clone(stored.boards as Record<BoardId, FactoryMap>)
            : {};

        const activeBoardId = typeof stored.activeBoardId === 'string'
            ? stored.activeBoardId
            : null;

        return {
            version: 1,
            activeBoardId,
            boards,
        };
    }

    private writeStore(store: CalculatorBoardStateStore): void {
        this.sessionStore.set(BOARD_STATE_STORE_KEY, this.clone(store));
    }

    private clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value));
    }
}
