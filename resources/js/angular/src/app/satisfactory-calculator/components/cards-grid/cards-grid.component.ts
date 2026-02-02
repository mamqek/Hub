import { Component, inject, HostListener, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import ELK from 'elkjs/lib/elk.bundled.js';

import { RecipeService, RecipeNode, RecipeResponse, IngredientsData, Ingredient, OptimizationGoal } from '../../services/recipe.service';
import { ZoomService } from 'app/satisfactory-calculator/services/zoom.service';
import { IngredientsService } from 'app/satisfactory-calculator/services/ingredients.service';
import { InputDialogComponent } from './includes/input-dialog/input-dialog.component';
import {
    RecipeSelectDialogComponent,
    RecipeSelectDialogResult,
} from './includes/recipe-select-dialog/recipe-select-dialog.component';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { MatDialog } from '@angular/material/dialog';

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

interface RenderEdge {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
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

    ingredientsData: IngredientsData = {
        input: [],
        intermediate: [],
        output: [],
        byproduct: []
    };

    nodes: RecipeNode[] = [];
    renderedEdges: RenderEdge[] = [];
    private nodePositions = new Map<number, { x: number; y: number }>();

    contentWidth = 2000;
    contentHeight = 2000;

    scale = 1;
    panX = 0;
    panY = 0;

    private isPanning = false;
    private isNodeDragging = false;
    private dragNodeId: number | null = null;
    private dragStartMouseX = 0;
    private dragStartMouseY = 0;
    private dragStartPanX = 0;
    private dragStartPanY = 0;
    private dragStartNodeX = 0;
    private dragStartNodeY = 0;
    private hasUserAdjustedView = false;

    selectedRecipes: Record<string, string> = {};
    recipeOptions: Record<string, string[]> = {};

    activeQuery: ActiveQuery = {
        item: 'supercomputer',
        amount: 10,
        ingredients: [],
        useIngredientsToMax: false,
        optimizationGoals: [],
    };

    private elk = new ELK();
    private activeRequest?: Subscription;

    summaryPositions: ConnectedPosition[] = [
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 12 },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -12 },
    ];

    @ViewChild('viewport') viewportRef!: ElementRef<HTMLElement>;

    constructor(
        private recipeService: RecipeService,
        private zoomService: ZoomService,
        private ingredientsService: IngredientsService,
        private cdr: ChangeDetectorRef
    ) {}

    readonly dialog = inject(MatDialog);

    get viewTransform(): string {
        return `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }

    trackById(index: number, _item: any): number {
        return index;
    }

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
    }

    stopDirection() {
        this.isShowingDirection = false;
    }

    public ngOnInit(): void {
        this.loadInitialRecipeWithRetry();
    }

    ngOnDestroy(): void {
        this.activeRequest?.unsubscribe();
        this.recipeService.unsubscribe();
    }

    @HostListener('window:resize')
    onResize() {
        if (!this.hasUserAdjustedView) {
            this.fitContentToViewport();
        }
    }

    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        if (event.code === 'KeyC' && !event.ctrlKey && !event.metaKey && !this.isDialogOpen()) {
            const target = event.target as HTMLElement | null;
            const tagName = (target?.tagName || '').toLowerCase();
            const isEditable = target?.isContentEditable || ['input', 'textarea', 'select'].includes(tagName);
            if (!isEditable) {
                event.preventDefault();
                this.centerView();
            }
            return;
        }

        if (event.code !== 'Space' || event.repeat || this.isDialogOpen()) {
            return;
        }

        const target = event.target as HTMLElement | null;
        const tagName = (target?.tagName || '').toLowerCase();
        const isEditable = target?.isContentEditable || ['input', 'textarea', 'select'].includes(tagName);
        if (isEditable) {
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
            this.nodePositions.set(this.dragNodeId, {
                x: this.dragStartNodeX + dx,
                y: this.dragStartNodeY + dy,
            });
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
        this.isPanning = false;
        this.isNodeDragging = false;
        this.dragNodeId = null;
    }

    onCanvasPointerDown(event: MouseEvent) {
        if (event.button !== 0 || this.isDialogOpen()) {
            return;
        }
        this.isPanning = true;
        this.dragStartMouseX = event.clientX;
        this.dragStartMouseY = event.clientY;
        this.dragStartPanX = this.panX;
        this.dragStartPanY = this.panY;
        this.hasUserAdjustedView = true;
    }

    onNodePointerDown(event: MouseEvent, node: RecipeNode) {
        if (event.button !== 0 || this.isDialogOpen()) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.isNodeDragging = true;
        this.dragNodeId = node.id;
        this.dragStartMouseX = event.clientX;
        this.dragStartMouseY = event.clientY;
        const pos = this.getNodePosition(node.id);
        this.dragStartNodeX = pos.x;
        this.dragStartNodeY = pos.y;
        this.hasUserAdjustedView = true;
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
        const newScale = Math.max(0.35, Math.min(2.8, this.scale * zoomFactor));
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

    getNodePosition(id: number): { x: number; y: number } {
        return this.nodePositions.get(id) || { x: 0, y: 0 };
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

        this.recipeService.getRecipe(itemKey, branchAmount, branchRecipes, this.activeQuery.optimizationGoals).subscribe({
            next: (branchData: RecipeResponse) => {
                const branchNodes = Array.isArray(branchData.recipeNodeArr) ? branchData.recipeNodeArr : [];
                if (!branchNodes.length) {
                    return;
                }
                this.replaceBranch(node.id, branchNodes);
                this.applyNodeColors();
                this.recipeOptions = { ...this.recipeOptions, ...(branchData.recipeOptions ?? {}) };
                this.ingredientsData = this.buildIngredientsDataFromNodes();
                void this.layoutGraph();
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
        this.nodes = data.recipeNodeArr;
        this.applyNodeColors();
        this.ingredientsData = data.ingredientsData;
        this.recipeOptions = data.recipeOptions ?? {};
        this.selectedPanelItem = null;
        void this.layoutGraph();
    }

    private applyNodeColors() {
        const extractionPalette: Array<{ match: RegExp; color: string }> = [
            { match: /iron/i, color: '#b84034' },
            { match: /copper/i, color: '#c86e2e' },
            { match: /caterium/i, color: '#caa313' },
            { match: /coal/i, color: '#333333' },
            { match: /limestone/i, color: '#8f8b83' },
            { match: /quartz/i, color: '#73a4cb' },
            { match: /sulfur/i, color: '#baa81b' },
            { match: /bauxite/i, color: '#8a4e2d' },
            { match: /uranium/i, color: '#4a9d2f' },
            { match: /sam/i, color: '#6f4fd1' },
            { match: /water/i, color: '#2f7fd9' },
            { match: /nitrogen/i, color: '#4ca9d8' },
            { match: /oil/i, color: '#5a465f' },
        ];

        const derivedPalette = ['#c056b7', '#3c9f6f', '#4e85d6', '#c57a2d', '#7c63cf', '#3a9ea6'];
        const nodeById = new Map(this.nodes.map((node) => [node.id, node]));
        const distanceMemo = new Map<number, number>();

        const distanceFromExtraction = (node: RecipeNode): number => {
            if (distanceMemo.has(node.id)) {
                return distanceMemo.get(node.id)!;
            }
            if (node.isBaseMaterial || !node.ingredients || node.ingredients.length === 0) {
                distanceMemo.set(node.id, 0);
                return 0;
            }

            const childDistances = node.ingredients
                .map((childId) => nodeById.get(childId))
                .filter((child): child is RecipeNode => Boolean(child))
                .map((child) => distanceFromExtraction(child));

            const distance = childDistances.length ? Math.min(...childDistances) + 1 : 0;
            distanceMemo.set(node.id, distance);
            return distance;
        };

        const getExtractionColor = (itemName: string): string => {
            const found = extractionPalette.find((entry) => entry.match.test(itemName));
            return found ? found.color : '#6b7a8f';
        };

        for (const node of this.nodes) {
            const distance = distanceFromExtraction(node);
            if (distance === 0) {
                node.cardColor = getExtractionColor(node.itemName);
                continue;
            }
            node.cardColor = derivedPalette[(distance - 1) % derivedPalette.length];
        }
    }

    private async layoutGraph() {
        if (!this.nodes.length) {
            this.renderedEdges = [];
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
                children: this.nodes
                    .slice()
                    .sort((a, b) => a.id - b.id)
                    .map((node) => ({ id: `${node.id}`, width: this.itemSize, height: this.itemSize })),
                edges: this.nodes
                    .filter((node) => node.parentId !== undefined)
                    .map((node) => ({
                        id: `e-${node.id}-${node.parentId}`,
                        sources: [`${node.id}`],
                        targets: [`${node.parentId}`],
                    })),
            };

            const layout = await this.elk.layout(layoutInput);
            const positioned = new Map<number, { x: number; y: number }>();
            for (const child of layout.children || []) {
                const id = Number(child.id);
                if (Number.isFinite(id)) {
                    positioned.set(id, { x: (child.x || 0) + 80, y: (child.y || 0) + 80 });
                }
            }

            if (positioned.size > 0) {
                this.nodePositions = positioned;
            }
        } catch (error) {
            console.error('ELK layout failed, using fallback layout.', error);
            let y = 80;
            this.nodePositions = new Map(this.nodes.map((node, idx) => [node.id, { x: 80 + idx * 30, y: y += 35 }]));
        }

        this.updateEdgeGeometry();
        this.updateContentSize();

        if (!this.hasUserAdjustedView) {
            this.fitContentToViewport();
        }

        this.cdr.detectChanges();
    }

    get suppressCardHints(): boolean {
        return this.isNodeDragging || this.isPanning || this.isShowingDirection;
    }

    private updateEdgeGeometry() {
        const nodeMap = new Map(this.nodes.map((node) => [node.id, node]));
        this.renderedEdges = this.nodes
            .filter((node) => node.parentId !== undefined)
            .map((node) => {
                const childPos = this.getNodePosition(node.id);
                const parentPos = this.getNodePosition(node.parentId!);
                return {
                    id: `edge-${node.id}-${node.parentId}`,
                    x1: childPos.x + this.itemSize,
                    y1: childPos.y + this.itemSize / 2,
                    x2: parentPos.x,
                    y2: parentPos.y + this.itemSize / 2,
                    label: `${node.productionRate} p/m`,
                };
            })
            .filter((edge) => nodeMap.has(Number(edge.id.split('-')[1])));
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

        const nextScale = Math.max(0.35, Math.min(1.4, Math.min(vw / graphWidth, vh / graphHeight)));
        this.scale = nextScale;
        this.boardZoomLevel = Number(this.scale.toFixed(2));

        const centerX = minX + graphWidth / 2;
        const centerY = minY + graphHeight / 2;
        this.panX = vw / 2 - centerX * this.scale;
        this.panY = vh / 2 - centerY * this.scale;
    }
}
