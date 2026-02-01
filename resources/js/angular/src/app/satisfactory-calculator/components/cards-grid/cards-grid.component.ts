import { Component, inject, HostListener, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragStart, CdkDragMove } from '@angular/cdk/drag-drop';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { MatDialog } from '@angular/material/dialog';

import { RecipeService, RecipeNode, RecipeResponse, IngredientsData, Ingredient } from '../../services/recipe.service';
import { DragScrollService } from '../../services/drag-scroll.service';
import { DrawLinesService } from '../../services/draw-lines.service';
import { DrawCircularGraphService } from 'app/satisfactory-calculator/services/draw-circular-graph.service';
import { ZoomService } from 'app/satisfactory-calculator/services/zoom.service';
import { IngredientsService } from 'app/satisfactory-calculator/services/ingredients.service';
import { InputDialogComponent } from './includes/input-dialog/input-dialog.component';
import { RecipeSelectDialogComponent } from './includes/recipe-select-dialog/recipe-select-dialog.component';

interface ActiveQuery {
    item: string;
    amount: number;
    ingredients: Ingredient[];
    useIngredientsToMax: boolean;
}

interface InputDialogResult {
    item: string;
    amount: number;
    ingredients?: Ingredient[];
    useIngredientsToMax?: boolean;
    selectedRecipes?: Record<string, string>;
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
            data: {
                item: this.activeQuery.item,
                selectedRecipes: this.selectedRecipes,
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
            };
            this.rerunActiveQuery();
        });
    }

    isDialogOpen(): boolean {
        return this.dialog.openDialogs.length > 0;
    }

    showDirection() {
        let el = document.querySelector('.board');
        if (el) {
            do {
                var styles = window.getComputedStyle(el);
                console.log(styles.zIndex, el);
            } while (el.parentElement && (el = el.parentElement));
        }
    }

    public ngOnInit(): void {
        setTimeout(() => { this.centerClientView(); }, 0);
        this.rerunActiveQuery();
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
            let arr = ('parentId' in node ? [{ id: node.id, children: node.ingredients, parentId: node.parentId }] : [])
                .concat(node.ingredients ? node.ingredients.map(id => ({ id, children: [], parentId: node.id })) : []);

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
        const options = this.recipeOptions[itemKey] ?? [];
        if (options.length > 0) {
            this.openRecipeDialog(itemKey, options);
            return;
        }

        // Fallback fetch for node-level selection if the active response did not include options for this item yet.
        this.recipeService.getBaseIngredients(itemKey, this.activeQuery.amount, this.selectedRecipes).subscribe({
            next: (response) => {
                const fetchedOptions = response?.recipeOptions?.[itemKey] ?? [];
                if (!fetchedOptions.length) {
                    return;
                }
                this.recipeOptions[itemKey] = fetchedOptions;
                this.openRecipeDialog(itemKey, fetchedOptions);
            },
            error: (err) => console.error('Error fetching node recipe options:', err),
        });
    }

    private normalizeItemName(value: string): string {
        return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    private resolveRecipeItemKey(itemName: string): string {
        const normalized = this.normalizeItemName(itemName);
        const exactKey = Object.keys(this.recipeOptions).find((key) => this.normalizeItemName(key) === normalized);
        return exactKey || itemName;
    }

    private openRecipeDialog(itemKey: string, options: string[]) {
        const dialogRef = this.dialog.open(RecipeSelectDialogComponent, {
            backdropClass: 'recipe-dialog-backdrop',
            data: {
                item: itemKey,
                options,
                selected: this.selectedRecipes[itemKey] ?? '',
            },
        });

        dialogRef.afterClosed().subscribe((selectedRecipe: string | null | undefined) => {
            if (selectedRecipe === undefined) {
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

    private rerunActiveQuery() {
        this.activeRequest?.unsubscribe();
        const { item, amount, ingredients, useIngredientsToMax } = this.activeQuery;

        if (Array.isArray(ingredients) && ingredients.length > 0) {
            this.activeRequest = this.recipeService.getRecipeWithLimits(
                item,
                ingredients,
                amount,
                useIngredientsToMax,
                this.selectedRecipes
            ).subscribe({
                next: (data: RecipeResponse) => this.applyRecipeData(data),
                error: (err) => console.error('Error fetching limited recipe:', err),
            });
            return;
        }

        this.activeRequest = this.recipeService.getRecipe(item, amount, this.selectedRecipes).subscribe({
            next: (data: RecipeResponse) => this.applyRecipeData(data),
            error: (err) => console.error('Error fetching data:', err),
        });
    }

    private applyRecipeData(data: RecipeResponse) {
        console.log('Received recipe data:', data);
        this.drawCircularGraphService.clearBoard(this.board);
        this.drawLinesService.resetLines();
        this.cdr.detectChanges();

        this.nodes = data.recipeNodeArr;
        this.ingredientsData = data.ingredientsData;
        this.recipeOptions = data.recipeOptions ?? {};
        this.selectedPanelItem = null;

        this.board = this.drawCircularGraphService.initGraph(this.nodes, this.board);
        this.cdr.detectChanges();

        this.drawLinesService.drawLines(this.nodes
            .map(node => ({
                id: node.id,
                children: node.ingredients,
                parentId: node.parentId
            }))
        );
    }

}
