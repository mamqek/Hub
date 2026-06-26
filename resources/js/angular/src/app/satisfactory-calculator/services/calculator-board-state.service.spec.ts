import { TestBed } from '@angular/core/testing';

import {
  BoardConnection,
  BoardNode,
  FactoryMap,
  Point,
  ROOT_OUTPOST_ID,
} from '../types/factory-model.types';
import { CalculatorBoardStateService } from './calculator-board-state.service';
import { SessionStoreService } from './session-store.service';

describe('CalculatorBoardStateService', () => {
  let service: CalculatorBoardStateService;
  let sessionStore: SessionStoreService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [CalculatorBoardStateService, SessionStoreService],
    });

    service = TestBed.inject(CalculatorBoardStateService);
    sessionStore = TestBed.inject(SessionStoreService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('creates an empty board with root outpost defaults', () => {
    const boardId = service.createBoard();
    const board = service.getBoard(boardId);

    expect(boardId).toContain('board-');
    expect(board?.rootOutpostId).toBe(ROOT_OUTPOST_ID);
    expect(board?.activeOutpostId).toBe(ROOT_OUTPOST_ID);
    expect(board?.outposts[ROOT_OUTPOST_ID].title).toBe('Main');
    expect(board?.outposts[ROOT_OUTPOST_ID].view).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });

  it('persists a full factory map and active board id through session storage', () => {
    const board = buildBoardFixture();
    const boardId = service.createBoard(board, 'board-fixture');

    const nextInstance = new CalculatorBoardStateService(sessionStore);
    const restoredBoard = nextInstance.getBoard(boardId);

    expect(nextInstance.getActiveBoardId()).toBe(boardId);
    expect(restoredBoard?.nodes['node-1'].position).toEqual({ x: 100, y: 200 });
    expect(restoredBoard?.connections['connection-1'].fromNodeId).toBe('node-1');
    expect(restoredBoard?.outposts[ROOT_OUTPOST_ID].nodeIds).toContain('node-1');
  });

  it('updates a single node position through updateNodePosition', () => {
    const boardId = service.createBoard(buildBoardFixture(), 'board-position');

    const updated = service.updateNodePosition(boardId, 'node-2', { x: 720, y: 810 });

    expect(updated?.nodes['node-1'].position).toEqual({ x: 100, y: 200 });
    expect(updated?.nodes['node-2'].position).toEqual({ x: 720, y: 810 });
  });

  it('adds a manual node to the requested outpost', () => {
    const boardId = service.createBoard(buildBoardFixtureWithChildOutpost(), 'board-add');
    const added = service.addNode(boardId, buildNode('node-manual', { x: 30, y: 40 }), 'outpost-a');

    expect(added?.nodes['node-manual'].parentOutpostId).toBe('outpost-a');
    expect(added?.outposts['outpost-a'].nodeIds).toContain('node-manual');
    expect(added?.outposts[ROOT_OUTPOST_ID].nodeIds).not.toContain('node-manual');
  });

  it('removes a node and cleans related connections and outpost membership', () => {
    const boardId = service.createBoard(buildBoardFixture(), 'board-remove');

    const updated = service.removeNode(boardId, 'node-2');

    expect(updated?.nodes['node-2']).toBeUndefined();
    expect(updated?.connections['connection-1']).toBeUndefined();
    expect(updated?.outposts[ROOT_OUTPOST_ID].nodeIds).not.toContain('node-2');
    expect(updated?.outposts[ROOT_OUTPOST_ID].connectionIds).not.toContain('connection-1');
  });

  it('persists a manual node without recipe and with optional machine placement', () => {
    const boardId = service.createBoard(undefined, 'board-manual');

    service.addNode(boardId, {
      id: 'node-storage',
      kind: 'storage',
      label: 'Container',
      itemName: null,
      position: { x: 400, y: 500 },
      parentOutpostId: ROOT_OUTPOST_ID,
      recipe: null,
      machine: {
        machineName: 'Industrial Storage Container',
        machineCount: 1,
      },
      cardColor: null,
      metadata: {},
    });

    const savedBoard = service.getBoard(boardId);

    expect(savedBoard?.nodes['node-storage'].recipe).toBeNull();
    expect(savedBoard?.nodes['node-storage'].machine?.machineName).toBe('Industrial Storage Container');
  });
});

function buildBoardFixture(): FactoryMap {
  const nodeA = buildNode('node-1', { x: 100, y: 200 });
  const nodeB = buildNode('node-2', { x: 300, y: 200 });
  const connection: BoardConnection = {
    id: 'connection-1',
    fromNodeId: 'node-1',
    toNodeId: 'node-2',
    itemName: 'Iron Ingot',
    productionRate: '30.00',
    metadata: {},
  };

  return {
    version: 1,
    rootOutpostId: ROOT_OUTPOST_ID,
    activeOutpostId: ROOT_OUTPOST_ID,
    nodes: {
      [nodeA.id]: nodeA,
      [nodeB.id]: nodeB,
    },
    connections: {
      [connection.id]: connection,
    },
    outposts: {
      [ROOT_OUTPOST_ID]: {
        id: ROOT_OUTPOST_ID,
        title: 'Main',
        parentOutpostId: null,
        position: { x: 0, y: 0 },
        view: { zoom: 1, panX: 0, panY: 0 },
        nodeIds: [nodeA.id, nodeB.id],
        connectionIds: [connection.id],
        childOutpostIds: [],
        boundaryPorts: {},
        metadata: {},
      },
    },
    metadata: {},
  };
}

function buildBoardFixtureWithChildOutpost(): FactoryMap {
  const base = buildBoardFixture();
  return {
    ...base,
    activeOutpostId: 'outpost-a',
    outposts: {
      ...base.outposts,
      'outpost-a': {
        id: 'outpost-a',
        title: 'Outpost A',
        parentOutpostId: ROOT_OUTPOST_ID,
        position: { x: 900, y: 100 },
        view: { zoom: 1, panX: 0, panY: 0 },
        nodeIds: [],
        connectionIds: [],
        childOutpostIds: [],
        boundaryPorts: {},
        metadata: {},
      },
    },
  };
}

function buildNode(id: string, position: Point): BoardNode {
  return {
    id,
    kind: 'recipe',
    label: id,
    itemName: id,
    position,
    parentOutpostId: ROOT_OUTPOST_ID,
    recipe: null,
    machine: null,
    cardColor: null,
    metadata: {},
  };
}
