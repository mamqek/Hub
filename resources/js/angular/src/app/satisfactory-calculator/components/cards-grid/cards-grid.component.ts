import { Component, inject, HostListener, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ConnectedOverlayPositionChange, ConnectedPosition } from '@angular/cdk/overlay';
import { Subscription } from 'rxjs';
import ELK from 'elkjs/lib/elk.bundled.js';

import {
    AlternateRecipeMeta,
    RecipeService,
    RecipeNode,
    RecipeResponse,
    IngredientsData,
    Ingredient,
    OptimizationGoal,
    RecipeStatistics,
    FactorySettingsPayload,
} from '../../services/recipe.service';
import { IngredientsService } from 'app/satisfactory-calculator/services/ingredients.service';
import { InputDialogComponent } from './includes/input-dialog/input-dialog.component';
import {
    SettingsDialogCategory,
    SettingsDialogCloseResult,
    SettingsDialogComponent,
} from './includes/settings-dialog/settings-dialog.component';
import {
    RecipeSelectDialogComponent,
    RecipeSelectDialogResult,
} from './includes/recipe-select-dialog/recipe-select-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { adaptRecipeNodesToFactoryMap, adaptRecipeResponseToFactoryMap } from '../../adapters/recipe-response-factory-map.adapter';
import {
    BuildingPaletteCategory,
    BuildingPaletteItem,
    BUILDING_PALETTE_CATEGORIES,
    BUILDING_PALETTE_ITEMS,
} from '../../data/building-palette.data';
import { CalculatorBoardStateService } from '../../services/calculator-board-state.service';
import { CalculatorSettings, CalculatorSettingsService, FactorySettings } from '../../services/calculator-settings.service';
import { CalculatorHistoryService, RecipeHistoryEntry } from '../../services/calculator-history.service';
import { BoardConnection, BoardNode, FactoryMap, NodeId, Point } from '../../types/factory-model.types';

interface InputDialogResult {
    item: string;
    amount: number;
    ingredients?: Ingredient[];
    useIngredientsToMax?: boolean;
    selectedRecipes?: Record<string, string>;
    optimizationGoals?: OptimizationGoal[];
}

interface RenderEdge {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
}

interface CardStatsChange {
    nodeId: NodeId;
    machineCount: number;
}

interface ActiveQuery {
    item: string;
    amount: number;
    ingredients: Ingredient[];
    useIngredientsToMax: boolean;
    optimizationGoals: OptimizationGoal[];
}

interface BuildingPaletteSection extends BuildingPaletteCategory {
    items: BuildingPaletteItem[];
}

@Component({
    selector: 'cards-grid',
    templateUrl: './cards-grid.component.html',
    styleUrl: './cards-grid.component.scss'
})
export class CardsGridComponent implements OnInit, OnDestroy {

    itemSize = 70;
    boardZoomLevel = 1;
    selectedPanelItem: string | null = null;
    isShowingDirection = false;
    isBuildingPaletteOpen = false;
    selectedBuildingPaletteItemId: string | null = null;
    hoveredBuildingPaletteItemId: string | null = null;
    buildingPaletteClientPoint: Point = { x: 0, y: 0 };
    private buildingPaletteBoardPoint: Point = { x: 0, y: 0 };
    buildingPaletteSide: 'left' | 'right' = 'right';

    ingredientsData: IngredientsData = {
        input: [],
        intermediate: [],
        output: [],
        byproduct: []
    };
    statistics: RecipeStatistics = {};
    isLoading = false;

    nodes: BoardNode[] = [];
    renderedEdges: RenderEdge[] = [];
    private recipeNodes: RecipeNode[] = [];
    private nodePositions = new Map<NodeId, Point>();
    private cardMachineCounts = new Map<NodeId, number>();

    contentWidth = 2000;
    contentHeight = 2000;

    scale = 1;
    panX = 0;
    panY = 0;

    private isPanning = false;
    private isNodeDragging = false;
    private dragNodeId: NodeId | null = null;
    private dragStartMouseX = 0;
    private dragStartMouseY = 0;
    private dragStartPanX = 0;
    private dragStartPanY = 0;
    private dragStartNodeX = 0;
    private dragStartNodeY = 0;
    private dragBoardId: string | null = null;
    private hasUserAdjustedView = false;

    selectedRecipes: Record<string, string> = {};
    recipeOptions: Record<string, string[]> = {};
    alternateRecipeMeta: Record<string, AlternateRecipeMeta> = {};
    settings: CalculatorSettings;
    historyEntries: RecipeHistoryEntry[] = [];
    currentHistoryId: string | null = null;
    private pendingHistoryLabel: string | null = null;
    isSummaryCollapsed = false;
    currentBoardId: string | null = null;
    private currentBoard: FactoryMap | null = null;

    activeQuery: ActiveQuery = {
        item: 'supercomputer',
        amount: 10,
        ingredients: [],
        useIngredientsToMax: false,
        optimizationGoals: [],
    };

    private elk = new ELK();
    private activeRequest?: Subscription;
    private settingsSub?: Subscription;
    readonly buildingPaletteSections: BuildingPaletteSection[] = BUILDING_PALETTE_CATEGORIES.map((category) => ({
        ...category,
        items: BUILDING_PALETTE_ITEMS.filter((item) => item.categoryId === category.id),
    }));
    readonly buildingPalettePositions: ConnectedPosition[] = [
        { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 16, offsetY: -14 },
        { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -16, offsetY: -14 },
    ];
    readonly buildingPaletteTooltipPositions: ConnectedPosition[] = [
        { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 12 },
        { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -12 },
    ];

    @ViewChild('viewport') viewportRef!: ElementRef<HTMLElement>;

    constructor(
        private recipeService: RecipeService,
        private ingredientsService: IngredientsService,
        private cdr: ChangeDetectorRef,
        private boardStateService: CalculatorBoardStateService,
        private settingsService: CalculatorSettingsService,
        private historyService: CalculatorHistoryService
    ) {
        this.settings = this.settingsService.getSettings();
    }

    readonly dialog = inject(MatDialog);

    get viewTransform(): string {
        return `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }

    trackById(index: number, item: { id?: string | number } | null): string | number {
        return item?.id ?? index;
    }

    openDialog() {
        this.closeBuildingPalette();
        const dialogRef = this.dialog.open(InputDialogComponent, {
            backdropClass: 'recipe-dialog-backdrop',
            width: '680px',
            maxWidth: '95vw',
            data: {
                item: this.activeQuery.item,
                selectedRecipes: this.selectedRecipes,
                optimizationGoals: this.activeQuery.optimizationGoals,
            },
        });

        dialogRef.afterClosed().subscribe((result: InputDialogResult | undefined) => {
            if (!result) {
                return;
            }

            this.selectedRecipes = { ...(result.selectedRecipes ?? {}) };
            this.activeQuery = {
                item: result.item,
                amount: result.amount,
                ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
                useIngredientsToMax: Boolean(result.useIngredientsToMax),
                optimizationGoals: Array.isArray(result.optimizationGoals) ? result.optimizationGoals : [],
            };
            this.rerunActiveQuery();
        });
    }

    isDialogOpen(): boolean {
        return this.dialog.openDialogs.length > 0;
    }

    showDirection() {
        this.isShowingDirection = true;
    }

    stopDirection() {
        this.isShowingDirection = false;
    }

    public ngOnInit(): void {
        this.historyEntries = this.historyService.getHistory();
        this.settingsSub = this.settingsService.settings$.subscribe((next) => {
            const previousFactory = this.settings?.factory;
            this.settings = next;
            const factoryChanged = this.hasFactorySettingsChanged(previousFactory, next.factory);
            if (this.nodes.length) {
                this.applyNodeColors();
                this.syncBoardNodesFromCurrentBoard();
                this.cdr.markForCheck();
            }
            if (factoryChanged && this.activeQuery.item) {
                this.rerunActiveQuery(false);
            }
        });
        if (!this.restoreLatestHistory()) {
            this.loadInitialRecipeWithRetry();
        }
    }

    ngOnDestroy(): void {
        this.activeRequest?.unsubscribe();
        this.settingsSub?.unsubscribe();
        this.recipeService.unsubscribe();
    }

    openSettingsDialog(initialCategory: SettingsDialogCategory = 'colors') {
        this.closeBuildingPalette();
        const dialogRef = this.dialog.open(SettingsDialogComponent, {
            backdropClass: 'recipe-dialog-backdrop',
            width: '920px',
            maxWidth: '96vw',
            data: {
                initialCategory,
                historyEntries: this.historyEntries,
                currentBoardEntry: this.buildCurrentBoardHistoryEntry(),
            },
        });
        dialogRef.afterClosed().subscribe((result: SettingsDialogCloseResult | undefined) => {
            if (!result?.loadHistoryId) {
                this.historyEntries = this.historyService.getHistory();
                return;
            }
            this.loadFromHistory(result.loadHistoryId);
        });
    }

    openHistoryFromSettings(): void {
        this.openSettingsDialog('history');
    }

    toggleSummary(): void {
        this.isSummaryCollapsed = !this.isSummaryCollapsed;
    }

    @HostListener('window:resize')
    onResize() {
        if (!this.hasUserAdjustedView) {
            this.fitContentToViewport();
        }
    }

    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        const target = event.target as HTMLElement | null;
        const isInteractive = this.isInteractiveElement(target);

        if (event.code === 'Escape' && this.isBuildingPaletteOpen && !this.isDialogOpen()) {
            event.preventDefault();
            this.closeBuildingPalette();
            return;
        }

        if (event.code === 'KeyC' && !event.ctrlKey && !event.metaKey && !this.isDialogOpen()) {
            if (!isInteractive) {
                event.preventDefault();
                this.centerView();
            }
            return;
        }

        if (event.code !== 'Space' || event.repeat || this.isDialogOpen()) {
            return;
        }

        if (isInteractive || this.isBuildingPaletteOpen) {
            return;
        }

        event.preventDefault();
        this.showDirection();
    }

    @HostListener('window:keyup', ['$event'])
    onKeyUp(event: KeyboardEvent) {
        if (event.code === 'Space' && this.isShowingDirection) {
            event.preventDefault();
            this.stopDirection();
        }
    }

    centerView() {
        this.hasUserAdjustedView = false;
        this.fitContentToViewport();
    }

    @HostListener('window:mousemove', ['$event'])
    onGlobalMouseMove(event: MouseEvent) {
        if (this.isNodeDragging && this.dragNodeId !== null) {
            const dx = (event.clientX - this.dragStartMouseX) / this.scale;
            const dy = (event.clientY - this.dragStartMouseY) / this.scale;
            const position = {
                x: this.dragStartNodeX + dx,
                y: this.dragStartNodeY + dy,
            };
            this.nodePositions.set(this.dragNodeId, position);
            this.setBoardNodePosition(this.dragNodeId, position);
            this.updateEdgeGeometry();
            this.cdr.markForCheck();
            return;
        }

        if (this.isPanning) {
            const dx = event.clientX - this.dragStartMouseX;
            const dy = event.clientY - this.dragStartMouseY;
            this.panX = this.dragStartPanX + dx;
            this.panY = this.dragStartPanY + dy;
            this.hasUserAdjustedView = true;
            this.cdr.markForCheck();
        }
    }

    @HostListener('window:mouseup')
    onGlobalMouseUp() {
        if (this.isNodeDragging && this.dragNodeId !== null && this.dragBoardId) {
            const currentPosition = this.nodePositions.get(this.dragNodeId);
            if (currentPosition && this.hasNodeMoved(currentPosition)) {
                const updatedBoard = this.boardStateService.updateNodePosition(
                    this.dragBoardId,
                    this.dragNodeId,
                    currentPosition
                );
                if (updatedBoard) {
                    this.currentBoard = updatedBoard;
                }
            }
        }

        this.isPanning = false;
        this.isNodeDragging = false;
        this.dragNodeId = null;
        this.dragBoardId = null;
    }

    onCanvasPointerDown(event: MouseEvent) {
        if (event.button !== 0 || this.isDialogOpen()) {
            return;
        }
        this.closeBuildingPalette();
        this.isPanning = true;
        this.dragStartMouseX = event.clientX;
        this.dragStartMouseY = event.clientY;
        this.dragStartPanX = this.panX;
        this.dragStartPanY = this.panY;
        this.hasUserAdjustedView = true;
    }

    onNodePointerDown(event: MouseEvent, node: BoardNode) {
        if (event.button !== 0 || this.isDialogOpen()) {
            return;
        }
        this.closeBuildingPalette();
        event.preventDefault();
        event.stopPropagation();
        this.isNodeDragging = true;
        this.dragNodeId = node.id;
        this.dragStartMouseX = event.clientX;
        this.dragStartMouseY = event.clientY;
        const pos = this.getNodePosition(node.id);
        this.dragStartNodeX = pos.x;
        this.dragStartNodeY = pos.y;
        this.dragBoardId = this.getCurrentBoardId();
        this.hasUserAdjustedView = true;
    }

    onBoardContextMenu(event: MouseEvent): void {
        if (this.isDialogOpen()) {
            return;
        }

        const viewport = this.viewportRef?.nativeElement;
        if (!viewport) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const rect = viewport.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;

        this.buildingPaletteClientPoint = {
            x: event.clientX,
            y: event.clientY,
        };
        this.buildingPaletteBoardPoint = {
            x: (localX - this.panX) / this.scale,
            y: (localY - this.panY) / this.scale,
        };
        this.isBuildingPaletteOpen = true;
        this.hoveredBuildingPaletteItemId = null;
        this.cdr.markForCheck();
    }

    onBuildingPalettePositionChange(change: ConnectedOverlayPositionChange): void {
        this.buildingPaletteSide = change.connectionPair.overlayX === 'start' ? 'right' : 'left';
    }

    onBuildingPaletteWheel(event: WheelEvent): void {
        event.stopPropagation();
    }

    closeBuildingPalette(): void {
        this.isBuildingPaletteOpen = false;
        this.hoveredBuildingPaletteItemId = null;
    }

    selectBuildingPaletteItem(item: BuildingPaletteItem, event?: MouseEvent): void {
        event?.preventDefault();
        event?.stopPropagation();
        this.selectedBuildingPaletteItemId = item.id;
        this.hoveredBuildingPaletteItemId = item.id;
    }

    setHoveredBuildingPaletteItem(itemId: string | null): void {
        this.hoveredBuildingPaletteItemId = itemId;
    }

    onWheel(event: WheelEvent) {
        if (this.isDialogOpen()) {
            return;
        }
        event.preventDefault();

        const viewport = this.viewportRef?.nativeElement;
        if (!viewport) {
            return;
        }

        const rect = viewport.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.max(0.15, Math.min(2.8, this.scale * zoomFactor));
        if (newScale === this.scale) {
            return;
        }

        const worldX = (mouseX - this.panX) / this.scale;
        const worldY = (mouseY - this.panY) / this.scale;

        this.panX = mouseX - worldX * newScale;
        this.panY = mouseY - worldY * newScale;
        this.scale = newScale;
        this.boardZoomLevel = Number(this.scale.toFixed(2));
        this.hasUserAdjustedView = true;
    }

    getNodePosition(id: NodeId): Point {
        return this.nodePositions.get(id) || { x: 0, y: 0 };
    }

    getItemImageUrl(name: string): string {
        return this.ingredientsService.getItemImageUrl(name);
    }

    get selectedBuildingPaletteItem(): BuildingPaletteItem | null {
        if (!this.selectedBuildingPaletteItemId) {
            return null;
        }

        return BUILDING_PALETTE_ITEMS.find((item) => item.id === this.selectedBuildingPaletteItemId) ?? null;
    }

    get buildingPaletteSelectionMessage(): string {
        if (this.selectedBuildingPaletteItem) {
            return `${this.selectedBuildingPaletteItem.label} is selected. The next step will place it at this click point.`;
        }

        if (Number.isFinite(this.buildingPaletteBoardPoint.x) && Number.isFinite(this.buildingPaletteBoardPoint.y)) {
            return 'Choose a building to prepare the next node at this click point.';
        }

        return 'Choose a building to prepare the next node.';
    }

    onPanelItemClick(name: string) {
        const normalized = this.normalizeItemName(name);
        if (!normalized) {
            return;
        }
        this.selectedPanelItem = this.selectedPanelItem === normalized ? null : normalized;
    }

    isNodeHighlighted(node: BoardNode): boolean {
        if (!this.selectedPanelItem) {
            return false;
        }
        return this.normalizeItemName(node.itemName || node.label) === this.selectedPanelItem;
    }

    isPanelItemSelected(name: string): boolean {
        if (!this.selectedPanelItem) {
            return false;
        }
        return this.normalizeItemName(name) === this.selectedPanelItem;
    }

    get quickHistoryEntries(): RecipeHistoryEntry[] {
        if (this.historyEntries.length <= 4) {
            return this.historyEntries;
        }
        return this.historyEntries.slice(0, 3);
    }

    get hasHistoryOverflow(): boolean {
        return this.historyEntries.length > 4;
    }

    get hiddenHistoryCount(): number {
        return Math.max(0, this.historyEntries.length - 3);
    }

    get overlayBackgroundColor(): string {
        return this.settings?.colors?.overlay?.backgroundColor || '#11251b';
    }

    get overlayTextColor(): string {
        return this.settings?.colors?.overlay?.textColor || '#ffffff';
    }

    isBuildingPaletteItemSelected(itemId: string): boolean {
        return this.selectedBuildingPaletteItemId === itemId;
    }

    getBuildingPalettePlaceholder(label: string): string {
        const parts = label
            .split(/[\s.-]+/)
            .map((part) => part.trim())
            .filter(Boolean);

        if (!parts.length) {
            return '??';
        }

        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }

        return parts
            .slice(0, 3)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('');
    }

    loadFromHistory(historyId: string): void {
        this.closeBuildingPalette();
        const promoted = this.historyService.promote(historyId);
        if (!promoted) {
            return;
        }

        this.historyEntries = this.historyService.getHistory();
        this.currentHistoryId = promoted.id;
        this.ensureBoardForHistoryEntry(promoted);
        this.selectedRecipes = { ...(promoted.selectedRecipes || {}) };
        this.activeQuery = {
            item: promoted.query.item,
            amount: promoted.query.amount,
            ingredients: Array.isArray(promoted.query.ingredients) ? promoted.query.ingredients : [],
            useIngredientsToMax: Boolean(promoted.query.useIngredientsToMax),
            optimizationGoals: Array.isArray(promoted.query.optimizationGoals) ? promoted.query.optimizationGoals : [],
        };
        this.applyRecipeData(promoted.response, false);
    }

    private restoreLatestHistory(): boolean {
        const latest = this.historyEntries[0];
        if (!latest?.response?.recipeNodeArr?.length) {
            return false;
        }

        this.currentHistoryId = latest.id;
        this.ensureBoardForHistoryEntry(latest);
        this.selectedRecipes = { ...(latest.selectedRecipes || {}) };
        this.activeQuery = {
            item: latest.query.item,
            amount: latest.query.amount,
            ingredients: Array.isArray(latest.query.ingredients) ? latest.query.ingredients : [],
            useIngredientsToMax: Boolean(latest.query.useIngredientsToMax),
            optimizationGoals: Array.isArray(latest.query.optimizationGoals) ? latest.query.optimizationGoals : [],
        };
        this.applyRecipeData(latest.response, false);
        return true;
    }

    private buildCurrentBoardHistoryEntry(): RecipeHistoryEntry | null {
        if (!this.recipeNodes.length) {
            return null;
        }

        return {
            id: 'current-board',
            createdAt: Date.now(),
            boardId: this.currentBoardId || '',
            query: {
                item: this.activeQuery.item,
                amount: this.activeQuery.amount,
                ingredients: Array.isArray(this.activeQuery.ingredients) ? this.activeQuery.ingredients : [],
                useIngredientsToMax: Boolean(this.activeQuery.useIngredientsToMax),
                optimizationGoals: Array.isArray(this.activeQuery.optimizationGoals) ? this.activeQuery.optimizationGoals : [],
            },
            selectedRecipes: { ...this.selectedRecipes },
            response: {
                ingredientsData: this.ingredientsData,
                recipeNodeArr: this.recipeNodes,
                recipeOptions: this.recipeOptions,
                alternateRecipeMeta: this.alternateRecipeMeta,
                statistics: this.statistics,
            },
        };
    }

    openRecipeSelectorForNode(node: BoardNode): void {
        const itemKey = this.resolveRecipeItemKey(node.itemName || node.label);
        this.openRecipeDialogForItem(itemKey, node);
    }

    openRecipeSelectorForItem(itemName: string): void {
        const itemKey = this.resolveRecipeItemKey(itemName);
        this.openRecipeDialogForItem(itemKey);
    }

    onCardStatsChange(change: CardStatsChange): void {
        if (!change || change.nodeId === undefined) {
            return;
        }
        if (!this.nodes.some((node) => node.id === change.nodeId)) {
            return;
        }
        this.cardMachineCounts.set(change.nodeId, change.machineCount);
        this.updateLiveStatistics();
    }

    private normalizeItemName(value: string): string {
        return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    private getCurrentBoardId(): string | null {
        return this.currentBoardId;
    }

    private createBoardFromResponse(data: RecipeResponse): string {
        const boardId = this.boardStateService.createBoard(adaptRecipeResponseToFactoryMap(data));
        this.currentBoardId = boardId;
        this.currentBoard = this.boardStateService.getBoard(boardId);
        this.boardStateService.setActiveBoard(boardId);
        this.syncBoardNodesFromCurrentBoard();
        this.syncNodePositionsFromCurrentBoard();
        return boardId;
    }

    private ensureBoardForHistoryEntry(entry: RecipeHistoryEntry): void {
        let boardId = entry.boardId;
        let board = boardId ? this.boardStateService.getBoard(boardId) : null;

        if (!board) {
            boardId = this.boardStateService.createBoard(adaptRecipeResponseToFactoryMap(entry.response));
            board = this.boardStateService.getBoard(boardId);
            this.historyService.updateBoardId(entry.id, boardId);
            this.historyEntries = this.historyService.getHistory();
        }

        if (!board) {
            this.currentBoardId = null;
            this.currentBoard = null;
            this.nodePositions.clear();
            return;
        }

        this.currentBoardId = boardId;
        this.currentBoard = board;
        this.boardStateService.setActiveBoard(boardId);
        this.syncBoardNodesFromCurrentBoard();
        this.syncNodePositionsFromCurrentBoard();
    }

    private findRecipeNode(nodeId: NodeId): RecipeNode | undefined {
        return this.recipeNodes.find((node) => `${node.id}` === nodeId);
    }

    private rebuildCurrentBoardFromNodes(): void {
        if (!this.currentBoardId) {
            return;
        }

        const nextBoard = adaptRecipeNodesToFactoryMap(this.recipeNodes, this.currentBoard);
        this.currentBoard = this.boardStateService.saveBoard(this.currentBoardId, nextBoard);
        this.syncBoardNodesFromCurrentBoard();
        this.syncNodePositionsFromCurrentBoard();
    }

    private syncBoardNodesFromCurrentBoard(): void {
        this.nodes = this.currentBoard
            ? Object.values(this.currentBoard.nodes).sort((a, b) => a.id.localeCompare(b.id))
            : [];
    }

    private syncNodePositionsFromCurrentBoard(): void {
        this.nodePositions = new Map<NodeId, Point>();
        if (!this.currentBoard) {
            return;
        }

        for (const node of this.nodes) {
            if (!this.currentBoard.nodes[node.id]) {
                continue;
            }
            this.nodePositions.set(node.id, {
                x: node.position.x,
                y: node.position.y,
            });
        }
    }

    private setBoardNodePosition(nodeId: NodeId, position: Point): void {
        if (!this.currentBoard?.nodes[nodeId]) {
            return;
        }
        this.currentBoard.nodes[nodeId].position = {
            x: position.x,
            y: position.y,
        };
    }

    private getBoardNodesNeedingLayout(): Set<string> {
        if (!this.currentBoard) {
            return new Set<string>();
        }

        return new Set(
            Object.values(this.currentBoard.nodes)
                .filter((node) => node.position.x === 0 && node.position.y === 0)
                .map((node) => node.id)
        );
    }

    private buildRenderEdge(connection: BoardConnection): RenderEdge | null {
        const fromPos = this.nodePositions.get(connection.fromNodeId);
        const toPos = this.nodePositions.get(connection.toNodeId);
        if (!fromPos || !toPos) {
            return null;
        }

        return {
            id: connection.id,
            x1: fromPos.x + this.itemSize,
            y1: fromPos.y + this.itemSize / 2,
            x2: toPos.x,
            y2: toPos.y + this.itemSize / 2,
            label: connection.productionRate
                ? `${connection.productionRate} p/m`
                : (connection.itemName ?? ''),
        };
    }

    private hasNodeMoved(position: Point): boolean {
        return Math.abs(position.x - this.dragStartNodeX) > 0.001 || Math.abs(position.y - this.dragStartNodeY) > 0.001;
    }

    private resolveRecipeItemKey(itemName: string): string {
        const normalized = this.normalizeItemName(itemName);
        const exactKey = Object.keys(this.recipeOptions).find((key) => this.normalizeItemName(key) === normalized);
        return exactKey || itemName;
    }

    private openRecipeDialog(itemKey: string, options: string[], sourceNode?: BoardNode) {
        this.closeBuildingPalette();
        const currentSelection = this.selectedRecipes[itemKey]
            ?? this.findCurrentRecipeName(itemKey)
            ?? sourceNode?.recipe?.recipeName
            ?? '';
        const dialogRef = this.dialog.open(RecipeSelectDialogComponent, {
            backdropClass: 'recipe-dialog-backdrop',
            data: {
                item: itemKey,
                options,
                selected: currentSelection,
                showApplyScope: Boolean(sourceNode),
                alternateRecipeMeta: this.alternateRecipeMeta,
            },
        });

        dialogRef.afterClosed().subscribe((result: RecipeSelectDialogResult | undefined) => {
            if (!result) {
                return;
            }
            const selectedRecipe = result.selectedRecipe;
            const previousRecipe = this.selectedRecipes[itemKey]
                ?? this.findCurrentRecipeName(itemKey)
                ?? sourceNode?.recipe?.recipeName
                ?? '';
            const historyLabel = this.buildHistoryLabel(itemKey, previousRecipe, selectedRecipe);

            if (sourceNode && !result.applyToAll && selectedRecipe) {
                this.rebuildSingleBranch(sourceNode, itemKey, selectedRecipe, historyLabel);
                return;
            }

            if (!selectedRecipe) {
                delete this.selectedRecipes[itemKey];
            } else {
                this.selectedRecipes[itemKey] = selectedRecipe;
            }

            this.pendingHistoryLabel = historyLabel;
            this.rerunActiveQuery(true);
        });
    }

    private openRecipeDialogForItem(itemKey: string, sourceNode?: BoardNode) {
        const options = this.recipeOptions[itemKey] ?? [];
        if (options.length > 0) {
            this.openRecipeDialog(itemKey, options, sourceNode);
            return;
        }

        this.recipeService.getBaseIngredients(
            itemKey,
            this.activeQuery.amount,
            this.selectedRecipes,
            this.activeQuery.optimizationGoals,
            this.getFactorySettingsPayload()
        ).subscribe({
            next: (response) => {
                const fetchedOptions = response?.recipeOptions?.[itemKey] ?? [];
                if (!fetchedOptions.length) {
                    return;
                }
                this.recipeOptions[itemKey] = fetchedOptions;
                this.alternateRecipeMeta = {
                    ...this.alternateRecipeMeta,
                    ...(response?.alternateRecipeMeta ?? {}),
                };
                this.openRecipeDialog(itemKey, fetchedOptions, sourceNode);
            },
            error: (err) => console.error('Error fetching recipe options:', err),
        });
    }

    private rebuildSingleBranch(node: BoardNode, itemKey: string, selectedRecipe: string, historyLabel?: string) {
        const sourceRecipeNode = this.findRecipeNode(node.id);
        if (!sourceRecipeNode) {
            return;
        }

        const branchRate = Number.parseFloat(`${sourceRecipeNode.productionRate || 0}`);
        const branchAmount = Number.isFinite(branchRate) && branchRate > 0 ? branchRate : 1;
        const branchRecipes: Record<string, string> = { ...this.selectedRecipes, [itemKey]: selectedRecipe };

        this.isLoading = true;
        this.recipeService.getRecipe(
            itemKey,
            branchAmount,
            branchRecipes,
            this.activeQuery.optimizationGoals,
            this.getFactorySettingsPayload()
        ).subscribe({
            next: (branchData: RecipeResponse) => {
                const branchNodes = Array.isArray(branchData.recipeNodeArr) ? branchData.recipeNodeArr : [];
                if (!branchNodes.length) {
                    return;
                }
                this.replaceBranch(Number(sourceRecipeNode.id), branchNodes);
                this.recipeOptions = { ...this.recipeOptions, ...(branchData.recipeOptions ?? {}) };
                this.alternateRecipeMeta = { ...this.alternateRecipeMeta, ...(branchData.alternateRecipeMeta ?? {}) };
                this.rebuildCurrentBoardFromNodes();
                this.applyNodeColors();
                this.syncBoardNodesFromCurrentBoard();
                this.ingredientsData = this.buildIngredientsDataFromBoard();
                this.statistics = this.buildDisplayStatistics({});
                this.pushCurrentBoardHistory(historyLabel);
                this.syncCurrentHistoryResponse();
                this.isLoading = false;
                void this.layoutGraph();
            },
            error: (err) => {
                console.error('Error rebuilding branch:', err);
                this.isLoading = false;
            },
        });
    }

    private replaceBranch(rootId: number, replacementNodes: RecipeNode[]) {
        const nodeMap = new Map(this.recipeNodes.map((n) => [n.id, n]));
        const rootNode = nodeMap.get(rootId);
        if (!rootNode) {
            return;
        }

        const toRemove = this.collectSubtreeIds(rootId, nodeMap);
        const survivors = this.recipeNodes.filter((node) => !toRemove.has(node.id));

        const replacementRoot = replacementNodes.find((n) => n.parentId === undefined) || replacementNodes[0];
        if (!replacementRoot) {
            return;
        }

        let nextId = Math.max(-1, ...survivors.map((n) => n.id), rootId) + 1;
        const idMap = new Map<number, number>();
        idMap.set(replacementRoot.id, rootId);
        for (const candidate of replacementNodes) {
            if (candidate.id === replacementRoot.id) {
                continue;
            }
            idMap.set(candidate.id, nextId++);
        }

        const remapped = replacementNodes.map((candidate) => {
            const mappedId = idMap.get(candidate.id)!;
            const mappedParent = candidate.parentId === undefined ? undefined : idMap.get(candidate.parentId);
            const mappedIngredients = (candidate.ingredients || [])
                .map((childId) => idMap.get(childId))
                .filter((childId): childId is number => childId !== undefined);

            const updated: RecipeNode = {
                ...candidate,
                id: mappedId,
                ingredients: mappedIngredients,
            };

            if (mappedParent === undefined) {
                if (rootNode.parentId !== undefined) {
                    updated.parentId = rootNode.parentId;
                } else {
                    delete updated.parentId;
                }
            } else {
                updated.parentId = mappedParent;
            }

            return updated;
        });

        this.recipeNodes = [...survivors, ...remapped].sort((a, b) => a.id - b.id);
    }

    private collectSubtreeIds(rootId: number, nodeMap: Map<number, RecipeNode>): Set<number> {
        const visited = new Set<number>();
        const stack = [rootId];
        while (stack.length > 0) {
            const current = stack.pop()!;
            if (visited.has(current)) {
                continue;
            }
            visited.add(current);
            const currentNode = nodeMap.get(current);
            for (const childId of currentNode?.ingredients || []) {
                stack.push(childId);
            }
        }
        return visited;
    }

    private buildIngredientsDataFromBoard(): IngredientsData {
        const input = new Map<string, number>();
        const intermediate = new Map<string, number>();
        const output = new Map<string, number>();
        const byproduct = new Map<string, number>();
        const outgoingCounts = new Map<NodeId, number>();

        const addAmount = (bucket: Map<string, number>, key: string, amount: number) => {
            bucket.set(key, (bucket.get(key) || 0) + amount);
        };

        if (!this.currentBoard) {
            return { input: [], intermediate: [], output: [], byproduct: [] };
        }

        for (const connection of Object.values(this.currentBoard.connections)) {
            outgoingCounts.set(connection.fromNodeId, (outgoingCounts.get(connection.fromNodeId) || 0) + 1);
        }

        for (const node of Object.values(this.currentBoard.nodes)) {
            const itemName = node.itemName || node.label;
            const rate = Number.parseFloat(`${node.recipe?.productionRate || 0}`) || 0;
            if (node.recipe?.isBaseMaterial) {
                addAmount(input, itemName, rate);
            } else if (!outgoingCounts.get(node.id)) {
                addAmount(output, itemName, rate);
            } else {
                addAmount(intermediate, itemName, rate);
            }

            for (const by of node.recipe?.byproducts || []) {
                const byRate = Number.parseFloat(`${by.productionRate || 0}`) || 0;
                addAmount(byproduct, by.itemName, byRate);
            }
        }

        const toList = (bucket: Map<string, number>): Ingredient[] =>
            Array.from(bucket.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([itemName, amount]) => ({ itemName, amount: Number(amount.toFixed(2)) }));

        return {
            input: toList(input),
            intermediate: toList(intermediate),
            output: toList(output),
            byproduct: toList(byproduct),
        };
    }

    private rerunActiveQuery(saveToHistory: boolean = true) {
        this.activeRequest?.unsubscribe();
        if (!saveToHistory) {
            this.pendingHistoryLabel = null;
        }
        const { item, amount, ingredients, useIngredientsToMax, optimizationGoals } = this.activeQuery;

        if (Array.isArray(ingredients) && ingredients.length > 0) {
            this.isLoading = true;
            this.activeRequest = this.recipeService.getRecipeWithLimits(
                item,
                ingredients,
                amount,
                useIngredientsToMax,
                this.selectedRecipes,
                optimizationGoals,
                this.getFactorySettingsPayload()
            ).subscribe({
                next: (data: RecipeResponse) => this.applyRecipeData(data, saveToHistory),
                error: (err) => {
                    console.error('Error fetching limited recipe:', err);
                    this.isLoading = false;
                },
            });
            return;
        }

        this.isLoading = true;
        this.activeRequest = this.recipeService.getRecipe(
            item,
            amount,
            this.selectedRecipes,
            optimizationGoals,
            this.getFactorySettingsPayload()
        ).subscribe({
            next: (data: RecipeResponse) => this.applyRecipeData(data, saveToHistory),
            error: (err) => {
                console.error('Error fetching data:', err);
                this.isLoading = false;
            },
        });
    }

    private loadInitialRecipeWithRetry(maxAttempts: number = 3, attempt: number = 1) {
        const { item, amount, optimizationGoals } = this.activeQuery;
        this.activeRequest?.unsubscribe();
        this.isLoading = true;
        this.activeRequest = this.recipeService.getRecipe(
            item,
            amount,
            this.selectedRecipes,
            optimizationGoals,
            this.getFactorySettingsPayload()
        ).subscribe({
            next: (data: RecipeResponse) => this.applyRecipeData(data),
            error: (err) => {
                console.error(`Initial getRecipe attempt ${attempt} failed:`, err);
                if (attempt >= maxAttempts) {
                    this.isLoading = false;
                    return;
                }
                setTimeout(() => this.loadInitialRecipeWithRetry(maxAttempts, attempt + 1), 700);
            },
        });
    }

    private applyRecipeData(data: RecipeResponse, saveToHistory: boolean = true) {
        this.recipeNodes = Array.isArray(data.recipeNodeArr) ? [...data.recipeNodeArr] : [];
        this.cardMachineCounts.clear();
        this.ingredientsData = data.ingredientsData;
        this.recipeOptions = data.recipeOptions ?? {};
        this.alternateRecipeMeta = data.alternateRecipeMeta ?? {};
        this.selectedPanelItem = null;
        this.isLoading = false;
        if (saveToHistory) {
            const boardId = this.createBoardFromResponse(data);
            this.pushHistoryEntry(data, this.pendingHistoryLabel || undefined, boardId);
            this.pendingHistoryLabel = null;
        } else if (!this.currentBoard) {
            this.createBoardFromResponse(data);
        }
        this.applyNodeColors();
        this.syncBoardNodesFromCurrentBoard();
        this.syncNodePositionsFromCurrentBoard();
        this.statistics = this.buildDisplayStatistics(data.statistics);
        void this.layoutGraph();
    }

    private syncCurrentHistoryResponse(): void {
        if (!this.currentHistoryId) {
            return;
        }

        const updated = this.historyService.updateResponse(this.currentHistoryId, {
            ingredientsData: this.ingredientsData,
            recipeNodeArr: this.recipeNodes,
            recipeOptions: this.recipeOptions,
            alternateRecipeMeta: this.alternateRecipeMeta,
            statistics: this.statistics,
        });

        if (updated) {
            this.historyEntries = this.historyService.getHistory();
        }
    }

    getHistoryTooltip(entry: RecipeHistoryEntry): string {
        if (entry.label && entry.label.trim() !== '') {
            return entry.label;
        }
        const normalizedItem = this.normalizeItemName(entry.query.item);
        const selectedRecipeKey = Object.keys(entry.selectedRecipes || {}).find(
            (key) => this.normalizeItemName(key) === normalizedItem
        );
        const selectedRecipe = selectedRecipeKey ? entry.selectedRecipes[selectedRecipeKey] : '';
        return selectedRecipe
            ? `${entry.query.item} - ${selectedRecipe}`
            : entry.query.item;
    }

    private pushHistoryEntry(response: RecipeResponse, label?: string, boardId?: string): void {
        this.historyEntries = this.historyService.push({
            boardId: boardId ?? this.currentBoardId ?? '',
            label: label?.trim() || undefined,
            query: {
                item: this.activeQuery.item,
                amount: this.activeQuery.amount,
                ingredients: Array.isArray(this.activeQuery.ingredients) ? this.activeQuery.ingredients : [],
                useIngredientsToMax: Boolean(this.activeQuery.useIngredientsToMax),
                optimizationGoals: Array.isArray(this.activeQuery.optimizationGoals) ? this.activeQuery.optimizationGoals : [],
            },
            selectedRecipes: { ...this.selectedRecipes },
            response,
        });
        this.currentHistoryId = this.historyEntries[0]?.id || null;
    }

    private pushCurrentBoardHistory(label?: string): void {
        const current = this.buildCurrentBoardHistoryEntry();
        if (!current) {
            return;
        }
        this.historyEntries = this.historyService.push({
            boardId: current.boardId,
            label: label?.trim() || undefined,
            query: current.query,
            selectedRecipes: current.selectedRecipes,
            response: current.response,
        });
        this.currentHistoryId = this.historyEntries[0]?.id || null;
    }

    private resolveRecipeLabel(value: string | undefined | null): string {
        const label = `${value || ''}`.trim();
        return label ? label : 'Auto';
    }

    private buildHistoryLabel(itemKey: string, previousRecipe?: string | null, nextRecipe?: string | null): string {
        const targetItem = this.activeQuery.item;
        const prevLabel = this.resolveRecipeLabel(previousRecipe);
        const nextLabel = this.resolveRecipeLabel(nextRecipe);
        if (this.normalizeItemName(itemKey) === this.normalizeItemName(targetItem)) {
            return `${targetItem}(${prevLabel} -> ${nextLabel})`;
        }
        return `${targetItem}(${itemKey}: ${prevLabel} -> ${nextLabel})`;
    }

    private findCurrentRecipeName(itemKey: string): string | undefined {
        const normalizedKey = this.normalizeItemName(itemKey);
        const node = this.nodes.find((candidate) => this.normalizeItemName(candidate.itemName) === normalizedKey);
        const recipeName = `${node?.recipeName || ''}`.trim();
        return recipeName || undefined;
    }

    canSelectRecipeForItem(itemName: string): boolean {
        const normalizedKey = this.normalizeItemName(itemName);
        const node = this.nodes.find((candidate) => this.normalizeItemName(candidate.itemName) === normalizedKey);
        if (!node) {
            return true;
        }
        if (node.isBaseMaterial) {
            return false;
        }
        const recipeName = `${node.recipeName || ''}`.trim().toLowerCase();
        if (recipeName === 'raw resource') {
            return false;
        }
        const machineName = `${node.machineName || ''}`.trim().toLowerCase();
        return !(machineName.includes('extractor') || machineName.includes('miner'));
    }

    private buildDisplayStatistics(source?: RecipeStatistics): RecipeStatistics {
        const stats: RecipeStatistics = { ...(source || {}) };

        if (stats.totalMachineCount === undefined) {
            const total = this.nodes.reduce((sum, node) => sum + (Number(node.machine?.machineCount) || 0), 0);
            stats.totalMachineCount = total.toFixed(2);
        }

        if (stats.recipeCount === undefined) {
            stats.recipeCount = new Set(
                this.nodes
                    .map((node) => (node.recipe?.recipeName || '').trim())
                    .filter((name) => !!name && name.toLowerCase() !== 'raw resource')
            ).size;
        }

        if (stats.itemCount === undefined) {
            stats.itemCount = new Set(this.nodes.map((node) => node.itemName || node.label)).size;
        }

        return stats;
    }

    private updateLiveStatistics(): void {
        const total = this.nodes.reduce((sum, node) => sum + this.resolveNodeMachineCount(node), 0);
        this.statistics = {
            ...(this.statistics || {}),
            totalMachineCount: total.toFixed(2),
        };
    }

    private resolveNodeMachineCount(node: RecipeNode): number {
        const override = this.cardMachineCounts.get(node.id);
        if (override !== undefined) {
            return override;
        }
        const raw = Number.parseFloat(`${node.machineCount || 0}`);
        return Number.isFinite(raw) ? raw : 0;
    }

    private applyNodeColors() {
        if (!this.currentBoard) {
            this.nodes = [];
            return;
        }

        const resourceColors = this.settings.colors.nodes.resourceColors;
        const extractionPalette: Array<{ match: RegExp; key: string }> = [
            { match: /iron/i, key: 'iron' },
            { match: /copper/i, key: 'copper' },
            { match: /caterium/i, key: 'caterium' },
            { match: /coal/i, key: 'coal' },
            { match: /limestone/i, key: 'limestone' },
            { match: /quartz/i, key: 'quartz' },
            { match: /sulfur/i, key: 'sulfur' },
            { match: /bauxite/i, key: 'bauxite' },
            { match: /uranium/i, key: 'uranium' },
            { match: /sam/i, key: 'sam' },
            { match: /water/i, key: 'water' },
            { match: /nitrogen/i, key: 'nitrogen' },
            { match: /oil/i, key: 'oil' },
        ];

        const layerPalette = this.settings.colors.nodes.layerColors;
        const nodeById = new Map(this.nodes.map((node) => [node.id, node]));
        const incomingNodeIds = new Map<NodeId, NodeId[]>();
        const distanceMemo = new Map<NodeId, number>();

        for (const connection of Object.values(this.currentBoard.connections)) {
            const existing = incomingNodeIds.get(connection.toNodeId) || [];
            existing.push(connection.fromNodeId);
            incomingNodeIds.set(connection.toNodeId, existing);
        }

        const distanceFromExtraction = (node: BoardNode): number => {
            if (distanceMemo.has(node.id)) {
                return distanceMemo.get(node.id)!;
            }
            const incoming = incomingNodeIds.get(node.id) || [];
            if (node.recipe?.isBaseMaterial || incoming.length === 0) {
                distanceMemo.set(node.id, 0);
                return 0;
            }

            const childDistances = incoming
                .map((childId) => nodeById.get(childId))
                .filter((child): child is BoardNode => Boolean(child))
                .map((child) => distanceFromExtraction(child));

            const distance = childDistances.length ? Math.min(...childDistances) + 1 : 0;
            distanceMemo.set(node.id, distance);
            return distance;
        };

        const getExtractionColor = (itemName: string): string => {
            if (this.settings.colors.nodes.disableResourceColors) {
                return layerPalette[0] || '#6b7a8f';
            }
            const found = extractionPalette.find((entry) => entry.match.test(itemName));
            if (!found) {
                return resourceColors['default'] || '#6b7a8f';
            }
            return resourceColors[found.key] || resourceColors['default'] || '#6b7a8f';
        };

        let didChange = false;
        for (const node of this.nodes) {
            const distance = distanceFromExtraction(node);
            let nextColor = node.cardColor ?? null;
            if (distance === 0 && !this.settings.colors.nodes.disableResourceColors) {
                nextColor = getExtractionColor(node.itemName || node.label);
            } else if (this.settings.colors.nodes.disableLayerColors) {
                nextColor = this.settings.colors.nodes.unifiedLayerColor || '#4e85d6';
            } else {
                nextColor = layerPalette[Math.min(distance, layerPalette.length - 1)] || '#4e85d6';
            }
            if (node.cardColor !== nextColor) {
                node.cardColor = nextColor;
                this.currentBoard.nodes[node.id].cardColor = nextColor;
                didChange = true;
            }
        }

        if (didChange && this.currentBoardId) {
            this.currentBoard = this.boardStateService.saveBoard(this.currentBoardId, this.currentBoard);
        }
    }

    private async layoutGraph() {
        if (!this.nodes.length) {
            this.nodePositions.clear();
            this.renderedEdges = [];
            return;
        }

        const boardId = this.getCurrentBoardId();
        if (!boardId || !this.currentBoard) {
            this.renderedEdges = [];
            return;
        }

        const nodesNeedingLayout = this.getBoardNodesNeedingLayout();
        if (nodesNeedingLayout.size === 0) {
            this.syncNodePositionsFromCurrentBoard();
            this.updateEdgeGeometry();
            this.updateContentSize();

            if (!this.hasUserAdjustedView) {
                this.fitContentToViewport();
            }

            this.cdr.detectChanges();
            return;
        }

        try {
            const layoutInput: any = {
                id: 'root',
                layoutOptions: {
                    'elk.algorithm': 'layered',
                    'elk.direction': 'RIGHT',
                    'elk.layered.spacing.nodeNodeBetweenLayers': '170',
                    'elk.spacing.nodeNode': '90',
                    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
                },
                children: Object.values(this.currentBoard.nodes)
                    .slice()
                    .sort((a, b) => a.id.localeCompare(b.id))
                    .map((node) => ({ id: node.id, width: this.itemSize, height: this.itemSize })),
                edges: Object.values(this.currentBoard.connections)
                    .map((connection) => ({
                        id: connection.id,
                        sources: [connection.fromNodeId],
                        targets: [connection.toNodeId],
                    })),
            };

            const layout = await this.elk.layout(layoutInput);
            for (const child of layout.children || []) {
                const nodeId = `${child.id}`;
                if (this.currentBoard.nodes[nodeId] && nodesNeedingLayout.has(nodeId)) {
                    this.currentBoard.nodes[nodeId].position = {
                        x: (child.x || 0) + 80,
                        y: (child.y || 0) + 80,
                    };
                }
            }
        } catch (error) {
            console.error('ELK layout failed, using fallback layout.', error);
            let y = 80;
            for (const node of Object.values(this.currentBoard.nodes).sort((a, b) => a.id.localeCompare(b.id))) {
                if (!nodesNeedingLayout.has(node.id)) {
                    continue;
                }
                node.position = { x: 80, y: y += 90 };
            }
        }

        this.currentBoard = this.boardStateService.saveBoard(boardId, this.currentBoard);
        this.syncNodePositionsFromCurrentBoard();
        this.updateEdgeGeometry();
        this.updateContentSize();

        if (!this.hasUserAdjustedView) {
            this.fitContentToViewport();
        }

        this.cdr.detectChanges();
    }

    get suppressCardHints(): boolean {
        return this.isNodeDragging || this.isPanning || this.isShowingDirection || this.isBuildingPaletteOpen;
    }

    private getFactorySettingsPayload(): FactorySettingsPayload {
        return {
            minerLevel: this.settings?.factory?.minerLevel || 1,
            beltLevel: this.settings?.factory?.beltLevel || 1,
        };
    }

    private hasFactorySettingsChanged(previous?: FactorySettings, next?: FactorySettings): boolean {
        if (!previous || !next) {
            return false;
        }

        return previous.minerLevel !== next.minerLevel
            || previous.beltLevel !== next.beltLevel;
    }

    private updateEdgeGeometry() {
        if (!this.currentBoard) {
            this.renderedEdges = [];
            return;
        }

        this.renderedEdges = Object.values(this.currentBoard.connections)
            .map((connection) => this.buildRenderEdge(connection))
            .filter((edge): edge is RenderEdge => Boolean(edge));
    }

    private updateContentSize() {
        let maxX = 0;
        let maxY = 0;
        for (const pos of this.nodePositions.values()) {
            maxX = Math.max(maxX, pos.x + this.itemSize + 120);
            maxY = Math.max(maxY, pos.y + this.itemSize + 120);
        }
        this.contentWidth = Math.max(1200, maxX);
        this.contentHeight = Math.max(900, maxY);
    }

    private fitContentToViewport() {
        const viewport = this.viewportRef?.nativeElement;
        if (!viewport || !this.nodes.length) {
            return;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const pos of this.nodePositions.values()) {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + this.itemSize);
            maxY = Math.max(maxY, pos.y + this.itemSize);
        }

        const graphWidth = Math.max(1, maxX - minX + 200);
        const graphHeight = Math.max(1, maxY - minY + 200);

        const vw = viewport.clientWidth;
        const vh = viewport.clientHeight;

        const nextScale = Math.max(0.15, Math.min(1.4, Math.min(vw / graphWidth, vh / graphHeight)));
        this.scale = nextScale;
        this.boardZoomLevel = Number(this.scale.toFixed(2));

        const centerX = minX + graphWidth / 2;
        const centerY = minY + graphHeight / 2;
        this.panX = vw / 2 - centerX * this.scale;
        this.panY = vh / 2 - centerY * this.scale;
    }

    private isInteractiveElement(target: HTMLElement | null): boolean {
        if (!target) {
            return false;
        }

        const tagName = (target.tagName || '').toLowerCase();
        if (target.isContentEditable || ['input', 'textarea', 'select', 'button', 'a'].includes(tagName)) {
            return true;
        }

        return Boolean(target.closest('.building-palette') || target.closest('.card-hint'));
    }
}
