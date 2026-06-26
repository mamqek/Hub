import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { CardsGridComponent } from './cards-grid.component';
import { adaptRecipeResponseToFactoryMap } from '../../adapters/recipe-response-factory-map.adapter';
import { BUILDING_PALETTE_ITEMS } from '../../data/building-palette.data';
import { CalculatorBoardStateService } from '../../services/calculator-board-state.service';
import { CalculatorHistoryService } from '../../services/calculator-history.service';
import { CalculatorSettingsService } from '../../services/calculator-settings.service';
import { IngredientsService } from '../../services/ingredients.service';
import { RecipeNode, RecipeResponse, RecipeService } from '../../services/recipe.service';
import { SessionStoreService } from '../../services/session-store.service';
import { FactoryMap, Point } from '../../types/factory-model.types';

interface ActiveQuery {
  item: string;
  amount: number;
  ingredients: Array<{ itemName: string; amount: number }>;
  useIngredientsToMax: boolean;
  optimizationGoals: Array<{ type: string; target: string }>;
}

describe('CardsGridComponent', () => {
  let component: CardsGridComponent;
  let fixture: ComponentFixture<CardsGridComponent>;
  let boardStateService: CalculatorBoardStateService;
  let historyService: CalculatorHistoryService;
  let recipeServiceSpy: jasmine.SpyObj<RecipeService>;

  beforeEach(async () => {
    sessionStorage.clear();

    recipeServiceSpy = jasmine.createSpyObj<RecipeService>('RecipeService', [
      'getRecipe',
      'getRecipeWithLimits',
      'getBaseIngredients',
      'unsubscribe',
    ]);
    recipeServiceSpy.getRecipe.and.returnValue(of(emptyResponse()));
    recipeServiceSpy.getRecipeWithLimits.and.returnValue(of(emptyResponse()));
    recipeServiceSpy.getBaseIngredients.and.returnValue(of({
      item: 'supercomputer',
      baseIngredients: [],
      recipeOptions: {},
      alternateRecipeMeta: {},
    }));

    await TestBed.configureTestingModule({
      declarations: [CardsGridComponent],
      providers: [
        SessionStoreService,
        CalculatorBoardStateService,
        CalculatorSettingsService,
        CalculatorHistoryService,
        { provide: RecipeService, useValue: recipeServiceSpy },
        { provide: IngredientsService, useValue: { getItemImageUrl: () => '' } },
        { provide: MatDialog, useValue: { openDialogs: [], open: jasmine.createSpy('open') } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(CardsGridComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CardsGridComponent);
    component = fixture.componentInstance;
    boardStateService = TestBed.inject(CalculatorBoardStateService);
    historyService = TestBed.inject(CalculatorHistoryService);

    stubComponentChangeDetection(component);
    (component as any).elk = {
      layout: jasmine.createSpy('layout').and.resolveTo({ children: [] }),
    };
    component.activeQuery = buildQuery();
    component.selectedRecipes = {};
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the building palette on board context menu and stores board coordinates', () => {
    setViewport(component, { left: 100, top: 50, width: 900, height: 700 });
    component.scale = 2;
    component.panX = 40;
    component.panY = 20;

    component.onBoardContextMenu(contextMenuEvent(300, 250));

    expect(component.isBuildingPaletteOpen).toBeTrue();
    expect(component.buildingPaletteClientPoint).toEqual({ x: 300, y: 250 });
    expect((component as any).buildingPaletteBoardPoint).toEqual({ x: 80, y: 90 });
  });

  it('keeps the building palette open and stores the selected building', () => {
    component.isBuildingPaletteOpen = true;

    component.selectBuildingPaletteItem(BUILDING_PALETTE_ITEMS[0]);

    expect(component.isBuildingPaletteOpen).toBeTrue();
    expect(component.selectedBuildingPaletteItemId).toBe('miner-mk1');
    expect(component.selectedBuildingPaletteItem?.label).toBe('Miner Mk.1');
  });

  it('closes the building palette when board panning starts', () => {
    component.isBuildingPaletteOpen = true;

    component.onCanvasPointerDown(pointerEvent(10, 20));

    expect(component.isBuildingPaletteOpen).toBeFalse();
  });

  it('creates a board-backed history entry for a new query result', () => {
    const response = emptyResponse(buildNodes([
      { id: 1, itemName: 'Iron Plate', ingredients: [2] },
      { id: 2, itemName: 'Iron Ingot', parentId: 1, isBaseMaterial: true },
    ]));

    (component as any).applyRecipeData(response);

    const [entry] = historyService.getHistory();

    expect(entry.boardId).toBeTruthy();
    expect(component.currentBoardId).toBe(entry.boardId);
    expect(boardStateService.getBoard(entry.boardId)?.nodes['1']).toBeDefined();
  });

  it('updates rendered position during drag and persists once on mouseup', () => {
    const nodes = buildNodes([
      { id: 1, itemName: 'Iron Plate' },
    ]);
    const boardId = seedBoard(component, boardStateService, emptyResponse(nodes), 'board-drag');
    const updateSpy = spyOn(boardStateService, 'updateNodePosition').and.callThrough();

    component.onNodePointerDown(pointerEvent(10, 20), component.nodes[0]);
    component.onGlobalMouseMove(mouseEvent(35, 55));

    expect(component.getNodePosition('1')).toEqual({ x: 125, y: 135 });
    expect(updateSpy).not.toHaveBeenCalled();

    component.onGlobalMouseUp();

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(boardStateService.getBoard(boardId)?.nodes['1'].position).toEqual({ x: 125, y: 135 });
  });

  it('does not persist a drag when mouseup happens without movement', () => {
    const nodes = buildNodes([
      { id: 1, itemName: 'Iron Plate' },
    ]);
    seedBoard(component, boardStateService, emptyResponse(nodes), 'board-no-move');
    const updateSpy = spyOn(boardStateService, 'updateNodePosition').and.callThrough();

    component.onNodePointerDown(pointerEvent(10, 20), component.nodes[0]);
    component.onGlobalMouseUp();

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('writes ELK layout positions back onto board nodes', async () => {
    const response = emptyResponse(buildNodes([
      { id: 1, itemName: 'Iron Plate', ingredients: [2] },
      { id: 2, itemName: 'Iron Ingot', parentId: 1, isBaseMaterial: true },
    ]));
    const boardId = seedBoard(component, boardStateService, response, 'board-layout', true);

    (component as any).elk = {
      layout: jasmine.createSpy('layout').and.resolveTo({
        children: [
          { id: '1', x: 10, y: 10 },
          { id: '2', x: 160, y: 60 },
        ],
      }),
    };
    (component as any).hasUserAdjustedView = true;

    await (component as any).layoutGraph();

    expect(boardStateService.getBoard(boardId)?.nodes['1'].position).toEqual({ x: 90, y: 90 });
    expect(boardStateService.getBoard(boardId)?.nodes['2'].position).toEqual({ x: 240, y: 140 });
  });

  it('reopens the same saved board snapshot from history', async () => {
    const response = emptyResponse(buildNodes([
      { id: 1, itemName: 'Computer', ingredients: [2] },
      { id: 2, itemName: 'Circuit Board', parentId: 1 },
    ]));
    const boardId = seedBoard(component, boardStateService, response, 'board-history');
    const [entry] = historyService.push({
      boardId,
      query: buildQuery({ item: 'computer', amount: 10 }),
      selectedRecipes: {},
      response,
    });

    updateBoardNodePosition(boardStateService, boardId, '1', { x: 720, y: 300 });
    updateBoardNodePosition(boardStateService, boardId, '2', { x: 420, y: 310 });
    (component as any).elk = {
      layout: jasmine.createSpy('layout').and.resolveTo({ children: [] }),
    };
    (component as any).hasUserAdjustedView = true;

    component.loadFromHistory(entry.id);
    await Promise.resolve();

    expect(component.currentHistoryId).toBe(entry.id);
    expect(component.currentBoardId).toBe(boardId);
    expect(component.getNodePosition('1')).toEqual({ x: 720, y: 300 });
    expect(component.getNodePosition('2')).toEqual({ x: 420, y: 310 });
  });

  it('migrates a legacy history entry without boardId on first load', async () => {
    const response = emptyResponse(buildNodes([
      { id: 1, itemName: 'Supercomputer', ingredients: [2] },
      { id: 2, itemName: 'Computer', parentId: 1 },
    ]));
    historyService.replaceHistory([{
      id: 'legacy-entry',
      createdAt: Date.now(),
      boardId: '',
      query: buildQuery({ item: 'supercomputer', amount: 10 }),
      selectedRecipes: {},
      response,
    }]);

    (component as any).elk = {
      layout: jasmine.createSpy('layout').and.resolveTo({
        children: [
          { id: '1', x: 0, y: 0 },
          { id: '2', x: 120, y: 0 },
        ],
      }),
    };
    (component as any).hasUserAdjustedView = true;

    component.ngOnInit();
    await Promise.resolve();

    const [entry] = historyService.getHistory();

    expect(entry.boardId).toBeTruthy();
    expect(component.currentBoardId).toBe(entry.boardId);
    expect(boardStateService.getBoard(entry.boardId)?.nodes['1']).toBeDefined();
  });
});

function buildQuery(overrides: Partial<ActiveQuery> = {}): ActiveQuery {
  return {
    item: 'supercomputer',
    amount: 10,
    ingredients: [],
    useIngredientsToMax: false,
    optimizationGoals: [],
    ...overrides,
  };
}

function buildNodes(
  overrides: Array<Partial<RecipeNode> & Pick<RecipeNode, 'id' | 'itemName'>>
): RecipeNode[] {
  return overrides.map((override, index) => ({
    id: override.id,
    itemName: override.itemName,
    productionRate: override.productionRate ?? '10.00',
    recipeName: override.recipeName,
    cardColor: override.cardColor,
    machineName: override.machineName ?? 'Assembler',
    machineCount: override.machineCount ?? 1,
    ingredients: override.ingredients ?? [],
    byproducts: override.byproducts ?? [],
    isBaseMaterial: override.isBaseMaterial ?? false,
    indentLevel: override.indentLevel ?? index,
    parentId: override.parentId,
  }));
}

function emptyResponse(nodes: RecipeNode[] = []): RecipeResponse {
  return {
    ingredientsData: {
      input: [],
      intermediate: [],
      output: [],
      byproduct: [],
    },
    recipeNodeArr: nodes,
    recipeOptions: {},
    alternateRecipeMeta: {},
    statistics: {},
  };
}

function seedBoard(
  component: CardsGridComponent,
  boardStateService: CalculatorBoardStateService,
  response: RecipeResponse,
  boardId: string,
  zeroPositions = false
): string {
  const board = adaptRecipeResponseToFactoryMap(response);
  if (!zeroPositions) {
    for (const [index, node] of Object.values(board.nodes).entries()) {
      node.position = { x: 100 + index * 200, y: 100 + index * 40 };
    }
  }

  const createdBoardId = boardStateService.createBoard(board, boardId);
  const savedBoard = boardStateService.getBoard(createdBoardId) as FactoryMap;
  component.currentBoardId = createdBoardId;
  (component as any).currentBoard = savedBoard;
  (component as any).recipeNodes = response.recipeNodeArr;
  (component as any).syncBoardNodesFromCurrentBoard();
  (component as any).syncNodePositionsFromCurrentBoard();
  return createdBoardId;
}

function updateBoardNodePosition(
  boardStateService: CalculatorBoardStateService,
  boardId: string,
  nodeId: string,
  position: Point
): void {
  boardStateService.updateNodePosition(boardId, nodeId, position);
}

function pointerEvent(clientX: number, clientY: number): MouseEvent {
  return {
    button: 0,
    clientX,
    clientY,
    preventDefault() {},
    stopPropagation() {},
  } as MouseEvent;
}

function mouseEvent(clientX: number, clientY: number): MouseEvent {
  return {
    clientX,
    clientY,
  } as MouseEvent;
}

function contextMenuEvent(clientX: number, clientY: number): MouseEvent {
  return {
    button: 2,
    clientX,
    clientY,
    preventDefault() {},
    stopPropagation() {},
  } as MouseEvent;
}

function setViewport(
  component: CardsGridComponent,
  rect: { left: number; top: number; width: number; height: number }
): void {
  component.viewportRef = {
    nativeElement: {
      clientWidth: rect.width,
      clientHeight: rect.height,
      getBoundingClientRect: () => ({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        x: rect.left,
        y: rect.top,
        toJSON: () => ({}),
      }),
    },
  } as any;
}

function stubComponentChangeDetection(component: CardsGridComponent): void {
  (component as any).cdr.detectChanges = () => {};
  (component as any).cdr.markForCheck = () => {};
}
