import { Component, inject, HostListener, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragStart, CdkDragMove } from '@angular/cdk/drag-drop';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { MatDialog } from '@angular/material/dialog';

import { RecipeService, RecipeNode, RecipeResponse, IngredientsData, Ingredient, OptimizationGoal } from '../../services/recipe.service';
import { DragScrollService } from '../../services/drag-scroll.service';
import { DrawLinesService } from '../../services/draw-lines.service';
import { DrawCircularGraphService } from 'app/satisfactory-calculator/services/draw-circular-graph.service';
import { ZoomService } from 'app/satisfactory-calculator/services/zoom.service';
import { IngredientsService } from 'app/satisfactory-calculator/services/ingredients.service';
import { InputDialogComponent } from './includes/input-dialog/input-dialog.component';
import {
    RecipeSelectDialogComponent,
    RecipeSelectDialogResult,
} from './includes/recipe-select-dialog/recipe-select-dialog.component';

interface ActiveQuery {
    item: string;
    amount: number;
    ingredients: Ingredient[];
    useIngredientsToMax: boolean;
    optimizationGoals: OptimizationGoal[];
}

interface InputDialogResult {
    item: string;
    amount: number;
    ingredients?: Ingredient[];
    useIngredientsToMax?: boolean;
    selectedRecipes?: Record<string, string>;
    optimizationGoals?: OptimizationGoal[];
}

@Component({
    selector: 'cards-grid',
    templateUrl: './cards-grid.component.html',
    styleUrl: './cards-grid.component.scss'
})
export class CardsGridComponent implements OnInit, OnDestroy {

    gridSize: number = 50;
    itemSize: number = 70;
    gap: number = 0;
    cellSize: number = this.itemSize + this.gap;
    currentCellSize: number = this.cellSize;

    @ViewChild('boardDiv') boardDiv!: ElementRef;
    board: (RecipeNode | null)[][] = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(null));
    nodes: RecipeNode[] = [];
    boardZoomLevel: number = 1;
    selectedPanelItem: string | null = null;
    isShowingDirection = false;

    ingredientsData: IngredientsData = {
        input: [],
        intermediate: [],
        output: [],
        byproduct: []
    };

    selectedRecipes: Record<string, string> = {};
    recipeOptions: Record<string, string[]> = {};

    activeQuery: ActiveQuery = {
        item: 'supercomputer',
        amount: 10,
        ingredients: [],
        useIngredientsToMax: false,
        optimizationGoals: [],
    };

    private activeRequest?: Subscription;

    summaryPositions: ConnectedPosition[] = [
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 12 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -12 },
    ];

    constructor(
        private recipeService: RecipeService,
        private dragScrollService: DragScrollService,
        private drawLinesService: DrawLinesService,
        private drawCircularGraphService: DrawCircularGraphService,
        private zoomService: ZoomService,
        private ingredientsService: IngredientsService,
        private cdr: ChangeDetectorRef
    ) {
        this.viewportHeight = window.innerHeight;
        this.viewportWidth = window.innerWidth;
    }

    viewportHeight: number;
    viewportWidth: number;

    trackById(index: number, _item: any): number {
        return index;
    }

    readonly dialog = inject(MatDialog);

    openDialog() {
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
        this.drawLinesService.startDirectionAnimation();
    }

    stopDirection() {
        this.isShowingDirection = false;
        this.drawLinesService.stopDirectionAnimation();
    }

    public ngOnInit(): void {
        setTimeout(() => { this.centerClientView(); }, 0);
        this.loadInitialRecipeWithRetry();
    }

    ngOnDestroy(): void {
        this.activeRequest?.unsubscribe();
        this.recipeService.unsubscribe();
    }

    private nodesWithArrowIdArr: number[] = [];

    dragStarted(event: CdkDragStart) {
        let node = event.source.data;

        this.nodesWithArrowIdArr = [
            ...('parentId' in node ? [node.id] : []),
            ...node.ingredients ?? []
        ];

        this.drawLinesService.hideLinesByElementId(this.nodesWithArrowIdArr);
    }

    dragMoved(_event: CdkDragMove) {
        // Reserved for live line updates while dragging.
    }

    drop(event: CdkDragDrop<{ x: number; y: number }>) {
        const previousIndex = event.previousContainer.data;
        const currentIndex = event.container.data;

        if (previousIndex !== currentIndex) {
            this.cdr.detectChanges();
            this.board[previousIndex.y][previousIndex.x] = null;
            this.board[currentIndex.y][currentIndex.x] = event.item.data;

            this.drawLinesService.removeLinesByElementId(this.nodesWithArrowIdArr);
            let node: RecipeNode = event.item.data;
            const nodesById = new Map(this.nodes.map((n) => [n.id, n]));
            let arr = ('parentId' in node ? [{ id: node.id, children: node.ingredients, parentId: node.parentId }] : [])
                .concat(node.ingredients ? node.ingredients.map(id => ({ id, children: [], parentId: node.id })) : [])
                .map((line) => {
                    const lineNode = nodesById.get(line.id);
                    return {
                        ...line,
                        flowText: lineNode ? `${lineNode.productionRate} p/m` : '',
                    };
                });

            setTimeout(() => {
                this.drawLinesService.drawLines(arr);
            }, 0);
        } else {
            this.drawLinesService.redrawLinesByElementId(this.nodesWithArrowIdArr);
        }
    }

    enterPredicate = (drag: CdkDrag, drop: CdkDropList) => {
        return !this.board[drop.data.y][drop.data.x];
    }

    @HostListener('window:keydown', ['$event'])
    zoomBoard(event: WheelEvent | KeyboardEvent, element: HTMLElement = this.boardDiv.nativeElement) {
        if (event instanceof KeyboardEvent && event.code === 'Space' && !event.repeat && !this.isDialogOpen()) {
            const target = event.target as HTMLElement | null;
            const tagName = (target?.tagName || '').toLowerCase();
            const isEditable = target?.isContentEditable || ['input', 'textarea', 'select'].includes(tagName);
            if (!isEditable) {
                event.preventDefault();
                this.showDirection();
            }
            return;
        }

        if (event instanceof KeyboardEvent && (event.ctrlKey || event.metaKey) && event.key === 'C'
            || this.isDialogOpen()) {
            return;
        }

        event.preventDefault();
        this.zoomService.handleZoom(event, element, (output: number | null) => {
            if (output !== null) {
                this.boardZoomLevel = output;
                this.drawLinesService.hideAllLines();
            }
        });
    }

    @HostListener('window:keyup', ['$event'])
    onKeyUp(event: KeyboardEvent) {
        if (event.code === 'Space' && this.isShowingDirection) {
            event.preventDefault();
            this.stopDirection();
        }
    }

    onZoomEnd(event: TransitionEvent) {
        if (event.propertyName === 'transform' && (event.target as HTMLElement).classList.contains('board')) {
            this.drawLinesService.redrawAllLines();
        }
    }

    onMouseDown(event: MouseEvent) {
        if (event?.target instanceof HTMLElement) {
            if (!event.target.className.includes('card')) {
                this.dragScrollService.onMouseDown(event);
            }
        }
    }

    centerClientView() {
        const boardHeight = this.gridSize * this.cellSize;
        const boardMiddlePositionX = boardHeight / 2;
        const boardMiddlePositionY = boardHeight / 2;

        const centerXOffset = this.viewportWidth * 0.5;
        const centerYOffset = this.viewportHeight * 0.5;

        window.scrollTo({
            left: boardMiddlePositionX - centerXOffset + this.cellSize / 2,
            top: boardMiddlePositionY - centerYOffset + this.cellSize / 2,
            behavior: 'smooth'
        });
    }

    getItemImageUrl(name: string): string {
        return this.ingredientsService.getItemImageUrl(name);
    }

    onPanelItemClick(name: string) {
        const normalized = this.normalizeItemName(name);
        if (!normalized) {
            return;
        }
        this.selectedPanelItem = this.selectedPanelItem === normalized ? null : normalized;
    }

    isNodeHighlighted(node: RecipeNode): boolean {
        if (!this.selectedPanelItem) {
            return false;
        }
        return this.normalizeItemName(node.itemName) === this.selectedPanelItem;
    }

    isPanelItemSelected(name: string): boolean {
        if (!this.selectedPanelItem) {
            return false;
        }
        return this.normalizeItemName(name) === this.selectedPanelItem;
    }

    openRecipeSelectorForNode(node: RecipeNode): void {
        const itemKey = this.resolveRecipeItemKey(node.itemName);
        this.openRecipeDialogForItem(itemKey, node);
    }

    openRecipeSelectorForItem(itemName: string): void {
        const itemKey = this.resolveRecipeItemKey(itemName);
        this.openRecipeDialogForItem(itemKey);
    }

    private normalizeItemName(value: string): string {
        return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    private resolveRecipeItemKey(itemName: string): string {
        const normalized = this.normalizeItemName(itemName);
        const exactKey = Object.keys(this.recipeOptions).find((key) => this.normalizeItemName(key) === normalized);
        return exactKey || itemName;
    }

    private openRecipeDialog(itemKey: string, options: string[], sourceNode?: RecipeNode) {
        const dialogRef = this.dialog.open(RecipeSelectDialogComponent, {
            backdropClass: 'recipe-dialog-backdrop',
            data: {
                item: itemKey,
                options,
                selected: this.selectedRecipes[itemKey] ?? '',
                showApplyScope: Boolean(sourceNode),
            },
        });

        dialogRef.afterClosed().subscribe((result: RecipeSelectDialogResult | undefined) => {
            if (!result) {
                return;
            }
            const selectedRecipe = result.selectedRecipe;

            // Node-level override can recalc only the clicked branch.
            if (sourceNode && !result.applyToAll && selectedRecipe) {
                this.rebuildSingleBranch(sourceNode, itemKey, selectedRecipe);
                return;
            }

            if (!selectedRecipe) {
                delete this.selectedRecipes[itemKey];
            } else {
                this.selectedRecipes[itemKey] = selectedRecipe;
            }

            this.rerunActiveQuery();
        });
    }

    private openRecipeDialogForItem(itemKey: string, sourceNode?: RecipeNode) {
        const options = this.recipeOptions[itemKey] ?? [];
        if (options.length > 0) {
            this.openRecipeDialog(itemKey, options, sourceNode);
            return;
        }

        this.recipeService.getBaseIngredients(
            itemKey,
            this.activeQuery.amount,
            this.selectedRecipes,
            this.activeQuery.optimizationGoals
        ).subscribe({
            next: (response) => {
                const fetchedOptions = response?.recipeOptions?.[itemKey] ?? [];
                if (!fetchedOptions.length) {
                    return;
                }
                this.recipeOptions[itemKey] = fetchedOptions;
                this.openRecipeDialog(itemKey, fetchedOptions, sourceNode);
            },
            error: (err) => console.error('Error fetching recipe options:', err),
        });
    }

    private rebuildSingleBranch(node: RecipeNode, itemKey: string, selectedRecipe: string) {
        const branchRate = Number.parseFloat(`${node.productionRate || 0}`);
        const branchAmount = Number.isFinite(branchRate) && branchRate > 0 ? branchRate : 1;
        const branchRecipes: Record<string, string> = { ...this.selectedRecipes, [itemKey]: selectedRecipe };

        this.recipeService.getRecipe(itemKey, branchAmount, branchRecipes).subscribe({
            next: (branchData: RecipeResponse) => {
                const branchNodes = Array.isArray(branchData.recipeNodeArr) ? branchData.recipeNodeArr : [];
                if (!branchNodes.length) {
                    return;
                }
                this.replaceBranch(node.id, branchNodes);
                this.recipeOptions = { ...this.recipeOptions, ...(branchData.recipeOptions ?? {}) };
                this.ingredientsData = this.buildIngredientsDataFromNodes();
                this.renderCurrentNodes();
            },
            error: (err) => console.error('Error rebuilding branch:', err),
        });
    }

    private replaceBranch(rootId: number, replacementNodes: RecipeNode[]) {
        const nodeMap = new Map(this.nodes.map((n) => [n.id, n]));
        const rootNode = nodeMap.get(rootId);
        if (!rootNode) {
            return;
        }

        const toRemove = this.collectSubtreeIds(rootId, nodeMap);
        const survivors = this.nodes.filter((node) => !toRemove.has(node.id));

        const replacementRoot = replacementNodes.find((n) => n.parentId === undefined) || replacementNodes[0];
        if (!replacementRoot) {
            return;
        }

        let nextId = Math.max(-1, ...survivors.map((n) => n.id), rootId) + 1;
        const idMap = new Map<number, number>();
        idMap.set(replacementRoot.id, rootId);
        for (const node of replacementNodes) {
            if (node.id === replacementRoot.id) {
                continue;
            }
            idMap.set(node.id, nextId++);
        }

        const remapped = replacementNodes.map((node) => {
            const mappedId = idMap.get(node.id)!;
            const mappedParent = node.parentId === undefined ? undefined : idMap.get(node.parentId);
            const mappedIngredients = (node.ingredients || [])
                .map((childId) => idMap.get(childId))
                .filter((childId): childId is number => childId !== undefined);

            const updated: RecipeNode = {
                ...node,
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

        this.nodes = [...survivors, ...remapped].sort((a, b) => a.id - b.id);
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

    private buildIngredientsDataFromNodes(): IngredientsData {
        const input = new Map<string, number>();
        const intermediate = new Map<string, number>();
        const output = new Map<string, number>();
        const byproduct = new Map<string, number>();

        const addAmount = (bucket: Map<string, number>, key: string, amount: number) => {
            bucket.set(key, (bucket.get(key) || 0) + amount);
        };

        for (const node of this.nodes) {
            const rate = Number.parseFloat(`${node.productionRate || 0}`) || 0;
            if (node.isBaseMaterial) {
                addAmount(input, node.itemName, rate);
            } else if (node.parentId === undefined) {
                addAmount(output, node.itemName, rate);
            } else {
                addAmount(intermediate, node.itemName, rate);
            }

            for (const by of node.byproducts || []) {
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

    private rerunActiveQuery() {
        this.activeRequest?.unsubscribe();
        const { item, amount, ingredients, useIngredientsToMax, optimizationGoals } = this.activeQuery;

        if (Array.isArray(ingredients) && ingredients.length > 0) {
            this.activeRequest = this.recipeService.getRecipeWithLimits(
                item,
                ingredients,
                amount,
                useIngredientsToMax,
                this.selectedRecipes,
                optimizationGoals
            ).subscribe({
                next: (data: RecipeResponse) => this.applyRecipeData(data),
                error: (err) => console.error('Error fetching limited recipe:', err),
            });
            return;
        }

        this.activeRequest = this.recipeService.getRecipe(item, amount, this.selectedRecipes, optimizationGoals).subscribe({
            next: (data: RecipeResponse) => this.applyRecipeData(data),
            error: (err) => console.error('Error fetching data:', err),
        });
    }

    private loadInitialRecipeWithRetry(maxAttempts: number = 3, attempt: number = 1) {
        const { item, amount, optimizationGoals } = this.activeQuery;
        this.activeRequest?.unsubscribe();
        this.activeRequest = this.recipeService.getRecipe(item, amount, this.selectedRecipes, optimizationGoals).subscribe({
            next: (data: RecipeResponse) => this.applyRecipeData(data),
            error: (err) => {
                console.error(`Initial getRecipe attempt ${attempt} failed:`, err);
                if (attempt >= maxAttempts) {
                    return;
                }
                setTimeout(() => this.loadInitialRecipeWithRetry(maxAttempts, attempt + 1), 700);
            },
        });
    }

    private applyRecipeData(data: RecipeResponse) {
        console.log('Received recipe data:', data);
        this.nodes = data.recipeNodeArr;
        this.ingredientsData = data.ingredientsData;
        this.recipeOptions = data.recipeOptions ?? {};
        this.selectedPanelItem = null;

        this.renderCurrentNodes();
    }

    private renderCurrentNodes() {
        this.drawCircularGraphService.clearBoard(this.board);
        this.drawLinesService.resetLines();
        this.cdr.detectChanges();

        this.board = this.drawCircularGraphService.initGraph(this.nodes, this.board);
        this.cdr.detectChanges();

        this.drawLinesService.drawLines(this.nodes
            .map(node => ({
                id: node.id,
                children: node.ingredients,
                parentId: node.parentId,
                flowText: `${node.productionRate} p/m`,
            }))
        );
    }

}
