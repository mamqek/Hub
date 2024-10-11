import { Component, inject,  HostListener, OnInit, ElementRef, Renderer2, ViewChild, ChangeDetectorRef, AfterViewChecked  } from '@angular/core';

import { RecipeService, RecipeNode, RecipeResponse, IngredientsData } from '../../services/recipe.service';
import { DragScrollService } from '../../services/drag-scroll.service';
import { DrawLinesService } from '../../services/draw-lines.service';
import { DrawCircularGraphService } from 'app/satisfactory-calculator/services/draw-circular-graph.service';
import { ZoomService } from 'app/satisfactory-calculator/services/zoom.service';

import { BehaviorSubject, tap, Observable, Subject, switchMap, takeUntil, Subscription, fromEvent, throttleTime, map, connect } from 'rxjs';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragStart, CdkDragMove, CdkDragPreview } from '@angular/cdk/drag-drop';
import { SatisfactoryCardComponent } from '../satisfactory-card/satisfactory-card.component';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import { InputDialogComponent } from './includes/input-dialog/input-dialog.component';



@Component({
  selector: 'cards-grid',
  templateUrl: './cards-grid.component.html',
  styleUrl: './cards-grid.component.scss'
})
export class CardsGridComponent implements OnInit {
    
    gridSize: number = 50;
    itemSize: number = 70;
    gap: number = 0;
    cellSize: number = this.itemSize + this.gap;
    currentCellSize: number = this.cellSize;

    private inputSubject = new BehaviorSubject<{ item: string; amount: number } | null>(null);
    public ingridientsArr$?: Observable<RecipeNode[]>;
    private unsubscribe$ = new Subject<void>();
    
    @ViewChild('boardDiv') boardDiv!: ElementRef;
    board: (RecipeNode | null)[][] = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(null));
    nodes: RecipeNode[] = [];
    boardZoomLevel: number = 1;
    
    ingredientsData!: IngredientsData;
    
    constructor(
        private recipeService: RecipeService, 
        private dragScrollService: DragScrollService, 
        private drawLinesService: DrawLinesService,
        private drawCircularGraphService: DrawCircularGraphService,
        private zoomService: ZoomService,
        private cdr: ChangeDetectorRef,
        private renderer: Renderer2
    ) {
        this.viewportHeight = window.innerHeight; // Set to 80% of the viewport height        
        this.viewportWidth = window.innerWidth; // Set to 80% of the viewport height
    }

    viewportHeight: number;
    viewportWidth: number;



    trackById(index: number, item: any): number {        
        return index;
    }

    readonly dialog = inject(MatDialog);

    openDialog() {
        const dialogRef = this.dialog.open(InputDialogComponent);
    
        dialogRef.afterClosed().subscribe(result => {
            console.log(`Dialog result: ${result}`);
            if (result) {
                // Assuming the dialog returns the item and amount
                const { item, amount } = result; // Adjust based on your dialog's return value

                // Emit new input values
                this.recipeService.updateInput(item, amount);
            }
        });
    }


    isDialogOpen(): boolean {
        return this.dialog.openDialogs.length > 0;
    }


    public ngOnInit(): void {        
        // Place user camera to default position
        setTimeout(() => {this.centerClientView()}, 0);

        // Set up the recipe fetching process
        this.recipeService.setupRecipeFetching().subscribe({
            next: (data: RecipeResponse) => {
                // Clear the board and reset the lines before updating the board
                this.drawCircularGraphService.clearBoard(this.board); 
                this.drawLinesService.resetLines();
                
                // call change detection, so html board deletes existing cards
                this.cdr.detectChanges();

                console.log("Fetched data:", data);

                // TODO: make board an observalbe as well to connect it to ngfor by this, before that ask chatgpt if that is a good idea
                this.nodes = data.recipeNodeArr;
                this.ingredientsData = data.ingredientsData;
                this.board = this.drawCircularGraphService.initGraph(this.nodes, this.board);
                
                // call change detection, so html notices update in this.board and creates cards, otherwise lines wont be able to find elements
                this.cdr.detectChanges();

                this.drawLinesService.drawLines(this.nodes
                    .map(node => ({
                        id: node.id, 
                        children: node.ingredients,
                        parentId: node.parentId
                    }))
                );
            },
            error: (err) => {
                console.error("Error fetching data:", err);
            }
        });


    }


    ngOnDestroy(): void {
        this.recipeService.unsubscribe(); // Clean up on destroy
    }

    // Drag and drop logic
    
    private nodesWithArrowIdArr: number[] = [];

    dragStarted(event: CdkDragStart) {
        let node = event.source.data;

        this.nodesWithArrowIdArr = [
            ...(node.parentId !== null ? [node.id] : []), 
            ...node.ingredients ?? []
        ];      
        this.drawLinesService.hideLinesByElementId(this.nodesWithArrowIdArr);    
    }

    dragMoved(event: CdkDragMove) {
        // if (this.isDragging) {
        //     console.log("dragMoved");
            
        //     let dict = this.drawLinesService.elementIdLineMap;

        //     this.nodesWithAroowIdArr.forEach(id => {
        //         dict[id].position();
        //     });
        // }
    }

    // Swap positions on the board array
    drop(event: CdkDragDrop<{ x: number; y: number }>) {   
        const previousIndex = event.previousContainer.data;
        const currentIndex = event.container.data;
      
        if (previousIndex !== currentIndex) {
            this.cdr.detectChanges();
            this.board[previousIndex.y][previousIndex.x] = null;
            this.board[currentIndex.y][currentIndex.x] = event.item.data;

            this.drawLinesService.removeLinesByElementId(this.nodesWithArrowIdArr);
            let node: RecipeNode = event.item.data;
            let arr = (node.parentId !== null ? [{ id: node.id, children: node.ingredients, parentId: node.parentId }] : [])
                    .concat(node.ingredients ? node.ingredients.map(id => ({ id, children: [], parentId: node.id })) : []);

            setTimeout(() => {
                this.drawLinesService.drawLines(arr);
            }, 0);
        } else {
            this.drawLinesService.redrawLinesByElementId(this.nodesWithArrowIdArr);
        }
    }
    
    enterPredicate = (drag: CdkDrag, drop: CdkDropList) => {   
        console.log("enterPredicate", drag.data, drop.data);
             
        return !this.board[drop.data.y][drop.data.x];  // Only allow drop into empty cells
    }




    // Zooming logic
    
    @HostListener('window:keydown', ['$event'])
    zoomBoard(event: WheelEvent | KeyboardEvent, element: HTMLElement = this.boardDiv.nativeElement) {
        // so Ctrl+"+" doesnt zoom the page, wheel doesnt scroll the page, but Ctrl+"C" still works
        if (event instanceof KeyboardEvent && (event.ctrlKey || event.metaKey) && event.key === 'C'
                || this.isDialogOpen()) {
            return;
        }
        
        event.preventDefault(); // Prevent default scrolling behavior
        this.zoomService.handleZoom(event, element, (output: number | null) => {
            if (output !== null) {                
                this.boardZoomLevel = output; // Update the board zoom level
                this.drawLinesService.hideAllLines(); // Call to hide lines
            }
        });
    }

    onZoomEnd(event: TransitionEvent) {
        // Check if the transition is for the 'transform' property and the element has the 'board' class
        if (event.propertyName === 'transform' && (event.target as HTMLElement).classList.contains('board')) {            
            this.drawLinesService.redrawAllLines();
        }
    }

    // Drag scrolling logic

    onMouseDown(event: MouseEvent) {
        if (event?.target instanceof HTMLElement) {
            if (!event.target.className.includes('card')) {
                this.dragScrollService.onMouseDown(event);
            }
        }
    }
    
    // Other 

    // @HostListener('contextmenu', ['$event'])
    // disableContextMenu(event: MouseEvent) {
    //   this.dragScrollService.disableContextMenu(event);
    // }

    centerClientView() {
        const boardHeight = this.gridSize * this.cellSize; // 5's for gap

        // this.dragScrollService.setViewport(this.viewport);
        // this.dragScrollService.setContentDimensions({ width: boardHeight, height: boardHeight });

        // this.viewport.scrollToIndex(10); 
        const boardMiddlePositionX = boardHeight / 2;
        const boardMiddlePositionY = boardHeight / 2;
        console.log("boardMiddlePositionX", boardMiddlePositionX);
        
        
        const centerXOffset = this.viewportWidth *  0.5; // Adjust as 50% of viewport width
        const centerYOffset = this.viewportHeight * 0.5; // Adjust as 50% of viewport height
        
        // Scroll to center the cell
        window.scrollTo({
            left: boardMiddlePositionX - centerXOffset + this.cellSize / 2,
            top:  boardMiddlePositionY - centerYOffset + this.cellSize / 2,
            behavior: 'smooth'
        });


        
        // scrollSubscription: Subscription | null = null;
        // this.viewport.scrollTo({
        //     left: boardMiddlePositionX - centerXOffset+ this.cellSize / 2,
        //     top:  boardMiddlePositionY - centerYOffset + this.cellSize / 2,
        // });
        // this.scrollSubscription = this.viewport.scrolledIndexChange.subscribe(() => {
        //     this.logRenderedRange();
        //   });
        // setTimeout(() => {
        //     this.recenterScroll(this.cellSize);
        // }, 3000);

    }

}


