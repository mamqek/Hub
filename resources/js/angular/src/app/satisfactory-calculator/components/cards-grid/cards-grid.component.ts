import { Component, inject,  HostListener, OnInit, ElementRef, Renderer2, ViewChild, ChangeDetectorRef, AfterViewChecked  } from '@angular/core';

import { RecipeService, RecipeNode } from '../../services/recipe.service';
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
export class CardsGridComponent implements OnInit, AfterViewChecked  {
    
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
      });
    }


    public ngOnInit(): void {        
        // Place user camera to default position
        setTimeout(() => {this.centerClientView()}, 0);

        // // Assembly Director System
        // this.ingridientsArr$ = this.recipeService.getRecipe("supercomputer", 10);
        
        this.inputSubject.next({ item: "supercomputer", amount: 10 });
        console.log("here");
        
        this.ingridientsArr$ = this.inputSubject.pipe(
            takeUntil(this.unsubscribe$),
            switchMap(input => {
                console.log("input", input);
                
                if (input) {
                    return this.recipeService.getRecipe(input.item, input.amount);
                } else {
                    // Return an empty observable or initial value if no input
                    return this.recipeService.getRecipe("supercomputer", 10);
                }
            }),
            tap(data => {     
                console.log("data", data);
                this.nodes = data;

                this.drawCircularGraphService.clearBoard(this.board);   
                // without setTinmeout first node gets instantly repoulated, so ngInit of card doesnt react and doesnt change the picture
                setTimeout(() => {
                    this.board = this.drawCircularGraphService.initGraph(this.nodes, this.board);
                }, 0);

                this.drawLinesService.resetLines();
                setTimeout(() => {
                    this.drawLinesService.drawLines(this.nodes
                        .map(node => ({
                            id: node.id, 
                            children: node.ingredients,
                            parentId: node.parentId
                        }))
                    );
                }, 0);
            })
        );

        // Subscribe to the ingredients observable to trigger the API call
        this.ingridientsArr$.subscribe({
            next: (data) => {
                // This block will be executed when data is fetched successfully
                console.log("Fetched data:", data);
            },
            error: (err) => {
                console.error("Error fetching data:", err);
            }
        });


    }


    ngOnDestroy(): void {
        // Emit a value to signal that the component is being destroyed
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
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
        }
    }
    
    enterPredicate = (drag: CdkDrag, drop: CdkDropList) => {        
        return !this.board[drop.data];  // Only allow drop into empty cells
    }


    // Draw lines initialization

    cardsInitialized: boolean = false;

    ngAfterViewChecked(): void {
        // Check if cards are initialized and perform jsPlumb logic
        if (this.nodes.length > 0 && !this.cardsInitialized) {
            this.cardsInitialized = true; // Prevent re-initialization
            this.drawLinesService.drawLines(this.nodes
                .map(node => ({
                    id: node.id, 
                    children: node.ingredients,
                    parentId: node.parentId
                }))
            );
        }
    }

    // Zooming logic
    
    @HostListener('window:keydown', ['$event'])
    zoomBoard(event: WheelEvent | KeyboardEvent, element: HTMLElement = this.boardDiv.nativeElement) {
        // so Ctrl+"+" doesnt zoom the page, wheel doesnt scroll the page, but Ctrl+"C" still works
        if (!(event instanceof KeyboardEvent && (event.ctrlKey || event.metaKey) && event.key === 'C')) {
            event.preventDefault(); // Prevent default scrolling behavior
        }
                
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


