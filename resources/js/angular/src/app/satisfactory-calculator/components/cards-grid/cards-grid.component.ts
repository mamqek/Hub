import { Component, inject,  HostListener, OnInit, ElementRef, Renderer2, ViewChild, ChangeDetectorRef, AfterViewChecked  } from '@angular/core';

import { RecipeService, RecipeNode } from '../../services/recipe.service';
import { DragScrollService } from '../../services/drag-scroll.service';
import { DrawLinesService } from '../../services/draw-lines.service';
import { ZoomService } from 'app/satisfactory-calculator/services/zoom.service';


import { Observable, Subject, Subscription, fromEvent, throttleTime, map, connect } from 'rxjs';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragStart, CdkDragMove } from '@angular/cdk/drag-drop';
import { SatisfactoryCardComponent } from '../satisfactory-card/satisfactory-card.component';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import { InputDialogComponent } from './includes/input-dialog/input-dialog.component';

interface Position {
    x: number;
    y: number;
};

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
    scrollSubscription: Subscription | null = null;

    board: (RecipeNode | null)[][] = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(null));
    boardMiddle: Position = { x: this.gridSize / 2, y: this.gridSize / 2 };
    nodes: RecipeNode[] = [];
    cardsInitialized: boolean = false;

    boardZoomLevel: number = 1;

    public ingridientsArr$?: Observable<RecipeNode[]>;
    
    constructor(
        private recipeService: RecipeService, 
        private dragScrollService: DragScrollService, 
        private drawLinesService: DrawLinesService,
        private zoomService: ZoomService,
        private cdr: ChangeDetectorRef,
        private renderer: Renderer2
        ) {
        this.viewportHeight = window.innerHeight; // Set to 80% of the viewport height        
        this.viewportWidth = window.innerWidth; // Set to 80% of the viewport height
    }

    viewportHeight: number;
    viewportWidth: number;


    @ViewChild('boardDiv') boardDiv!: ElementRef;

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
        setTimeout(() => {

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


        }, 0);


        console.log("initialized");
        

        // Assembly Director System
        this.ingridientsArr$ = this.recipeService.getRecipe("supercomputer", 10);
        
        this.ingridientsArr$.subscribe((data) => {
            console.log("data", data);
            this.nodes = data;

            this.board[this.boardMiddle.y][this.boardMiddle.x] = this.nodes[0];            
            this.drawGraph(this.nodes[0], this.boardMiddle);
        })

        // let triangleCircle : { [degree: number]: Position } = this.getFullCircleCoordinates(4.5, this.boardMiddle);
        // console.log("getFullCircleCoordinatesTriangle", triangleCircle );
        // for (const [degree, pos] of Object.entries(triangleCircle)) {
        //     this.board[pos.y][pos.x] = { id: parseInt(degree), itemName: degree, machineCount: "5.00", machineName: "Assembler", productionRate: "10.00", ingredients: [1, 9], indentLevel: 0 };
        // }
    }



    // TODO: add some angle to min angle each indent level to make it more readable
    // TODO: make an animation that nodes add on the board in slow motion one by one in whatever order they are processed, and when node is added it gets connected by following arrow with draw animation (and maybe movement paths).
    drawGraph (node: RecipeNode, center: Position, degrees: {lower: number, upper: number} = {lower: 0, upper: 360}) {
        // Exit if ingredients is undefined or not an array
        if (!node.ingredients || !Array.isArray(node.ingredients)) return;
        
        let num_of_ingredients = node.ingredients.length;
        
        let defaultRadius = 2.5;   
        
        // Minimum angle for each ingredient
        const minAngle = 30; 
    
        // Calculate the total angle available to the current node
        let circle_segment = degrees.upper - degrees.lower;
        
        // Calculate total required angle based on minAngle
        const totalRequiredAngle = num_of_ingredients * minAngle;

        // Check if we have enough space to place all ingredients
        if (totalRequiredAngle > circle_segment) {
            console.warn("Not enough space for all ingredients, adjusting...");
            console.warn(node.itemName);
            
            // Increase radius to get more space for ingredients
            circle_segment = totalRequiredAngle;
            defaultRadius +=1
        }

        // Calculate the angle segment based on the number of ingredients that can fit
        const ingredient_segment = circle_segment / num_of_ingredients; 
        
        for (const [index, ingredientId] of node.ingredients.entries()) {
            let radius = defaultRadius;
            let lowerBoundDegree = degrees.lower + index * ingredient_segment;
            let upperBoundDegree = lowerBoundDegree + ingredient_segment;    

            const ingredientNode = this.nodes.find(n => n.id === ingredientId);
            if (ingredientNode) {

                let random: boolean = false;

                if (num_of_ingredients == 2 && ingredientNode.indentLevel == 1) {   // special settings for 2 ingridient recepy
                    random = false;
                    lowerBoundDegree = 150;
                    upperBoundDegree = 210;
                } else if (num_of_ingredients > 1) {            // Randomize angle if many ingredients, so they are not in a straight line
                    random = true;
                } else if (ingredientNode.indentLevel == 1) {   // Main ingridients usually have long process, so move them away 
                    radius += num_of_ingredients - 2;
                    random = false; 
                }
                
                let ingredientNodeIngridients: number[] | undefined = ingredientNode.ingredients;
                if (ingredientNodeIngridients && ingredientNodeIngridients.length > 1) {
                    radius += ingredientNodeIngridients.length -1 ;                                        
                }
                
                let circle = this.getFullCircleCoordinates(radius, center);
                let position = this.getDegreeCoordinate(lowerBoundDegree, upperBoundDegree, circle, random);
                
                // If no angle is found in boundaries, increase radius and try again
                while (!position) {
                    console.warn("No position found, increasing radius...");
                    
                    lowerBoundDegree -= ingredient_segment / 2;
                    upperBoundDegree += ingredient_segment / 2;
                    circle = this.getFullCircleCoordinates(radius, center);
                    position = this.getDegreeCoordinate(lowerBoundDegree, upperBoundDegree, circle, random);
                }

                // To make each main ingridient take more space, as its on the distance from others
                if (ingredientNode.indentLevel == 1) {
                    lowerBoundDegree -= ingredient_segment / 2;
                    upperBoundDegree += ingredient_segment / 2;                    
                }

                this.board[position.y][position.x] = ingredientNode;
                this.drawGraph(ingredientNode, position, {  lower: lowerBoundDegree, upper: upperBoundDegree });

            }
        }
    }

    getDegreeCoordinate(lowerBoundDegree: number, upperBoundDegree: number, circle: { [degree: number]: Position }, random: boolean): Position | null {

        let filteredDegrees = Object.entries(circle).reduce<{ [degree: number]: Position }>((acc, [degree, pos]) => {
            const degreeNum = parseInt(degree);
            
            if (lowerBoundDegree < 0) {
                lowerBoundDegree += 360;
            }

            if (lowerBoundDegree >= upperBoundDegree) {
                upperBoundDegree += 360;
            }    
            
            if (degreeNum >= lowerBoundDegree && degreeNum <= upperBoundDegree) {
                acc[degreeNum] = pos;                                                                                           
            }
            return acc;
        }, {});


        // TODO: add some randomness to angle chosement
        // if node has 3 or more ingridients, set its position on edge of circel withn r 5 and give it 360&degr , else go with given angle( for small straight lines)        

        let degrees = Object.keys(filteredDegrees);

        let closestDegree: number | null = null;

        if (random) {
        
            this.shuffleArray(degrees);
        
            for (const degree of degrees) {            
                const degreeNum = parseInt(degree);
                if (this.isEmptyArea(this.board, filteredDegrees[degreeNum].y, filteredDegrees[degreeNum].x)) {
                    closestDegree = degreeNum; // Update closest degree
                    break;
                }
            }
        } else{

            // Calculate the middle degree
            const middleDegree = (lowerBoundDegree + upperBoundDegree) / 2;
            // Find the closest degree to the middle degree
            let closestDistance = Infinity; // Start with a large distance
            for (const degree of degrees) {
                const degreeNum = parseInt(degree);
                const distance = Math.abs(degreeNum - middleDegree); // Calculate the distance from the middle degree
    
                if (distance < closestDistance && this.isEmptyArea(this.board, filteredDegrees[degreeNum].y, filteredDegrees[degreeNum].x)) {
                    closestDistance = distance;
                    closestDegree = degreeNum; // Update closest degree
                }
            }
        }
        
        // Return the position of the closest degree or null if not found
        return closestDegree !== null ? filteredDegrees[closestDegree] : null;
    }

    shuffleArray(array: any[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)); // Random index
            // Swap elements
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    isEmptyArea(grid: any[][], row: number, col: number): boolean {
        // Define the directions (including diagonals)
        const directions = [
            { x: -1, y: -1 }, // top-left
            { x: -1, y: 0 },  // top
            { x: -1, y: 1 },  // top-right
            { x: 0, y: -1 },  // left
            { x: 0, y: 1 },   // right
            { x: 1, y: -1 },  // bottom-left
            { x: 1, y: 0 },   // bottom
            { x: 1, y: 1 }    // bottom-right
        ];
    
        // Check if the specified coordinate is within bounds
        if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) {
            return false; // Out of bounds
        }
    
        // Check if the specified coordinate is empty
        if (grid[row][col] !== null && grid[row][col] !== 0) {
            return false; // Not empty
        }
    
        // Check all neighboring coordinates
        for (const { x, y } of directions) {
            const newRow = row + x;
            const newCol = col + y;
    
            // Check bounds
            if (newRow >= 0 && newRow < grid.length && newCol >= 0 && newCol < grid[0].length) {
                if (grid[newRow][newCol] !== null && grid[newRow][newCol] !== 0) {
                    return false; // Found non-empty neighbor
                }
            }
        }
    
        return true; // All checked positions are empty
    }


    getFullCircleCoordinates(radius: number, center: Position): { [degree: number]: Position } {
        const circle: { [degree: number]: Position } = {};
    
        const limit = Math.floor(radius * Math.sqrt(0.5)); // Limit for r
    
        for (let r = 0; r <= limit; r++) {
            const d = Math.floor(Math.sqrt(radius * radius - r * r));
    
            // Draw 8 symmetric points
            addCirclePoint(circle, center, center.x - d, center.y + r); // Left, Top
            addCirclePoint(circle, center, center.x + d, center.y + r); // Right, Top
            addCirclePoint(circle, center, center.x - d, center.y - r); // Left, Bottom
            addCirclePoint(circle, center, center.x + d, center.y - r); // Right, Bottom
            addCirclePoint(circle, center, center.x + r, center.y - d); // Top, Right
            addCirclePoint(circle, center, center.x + r, center.y + d); // Bottom, Right
            addCirclePoint(circle, center, center.x - r, center.y - d); // Top, Left
            addCirclePoint(circle, center, center.x - r, center.y + d); // Bottom, Left
        }

        return circle;

        function addCirclePoint(circleCoords: { [degree: number]: Position }, center: Position, x: number, y: number) {
            const coordExists = Object.values(circleCoords).some(pos => pos.x === x && pos.y === y);
            if (!coordExists) {
                let angle = Math.atan2(y - center.y, x - center.x) * (180 / Math.PI);

                if (angle < 0) {
                    angle += 360;
                }
                circleCoords[Math.round(angle)] = { x, y };
            }
        }
    
    }




    private isDragging: boolean = false;
    private nodesWithArrowIdArr: number[] = [];

    dragStarted(event: CdkDragStart) {
        this.isDragging = true;
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

        this.isDragging = false;
    }
    
    enterPredicate = (drag: CdkDrag, drop: CdkDropList) => {        
        return !this.board[drop.data];  // Only allow drop into empty cells
    }


    


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


    onMouseDown(event: MouseEvent) {
        if (event?.target instanceof HTMLElement) {
            if (!event.target.className.includes('card')) {
                this.dragScrollService.onMouseDown(event);
            }
        }
    }
  
    @HostListener('contextmenu', ['$event'])
    disableContextMenu(event: MouseEvent) {
      this.dragScrollService.disableContextMenu(event);
    }



        
        
        





}


