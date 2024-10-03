import { Component,  HostListener, OnInit, ElementRef, ViewChild, ChangeDetectorRef, AfterViewChecked  } from '@angular/core';

import { RecipeService, RecipeNode } from '../../services/recipe.service';
import { DragScrollService } from '../../services/drag-scroll.service';
import { DrawLinesService } from '../../services/draw-lines.service';

import { Observable, Subject, Subscription, fromEvent, throttleTime, map, connect } from 'rxjs';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragStart } from '@angular/cdk/drag-drop';
import { SatisfactoryCardComponent } from '../satisfactory-card/satisfactory-card.component';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';


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
    
    gridSize: number = 80;
    cellSize: number = 50;

    board: (RecipeNode | null)[][] = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(null));
    boardMiddle: Position = { x: this.gridSize / 2, y: this.gridSize / 2 };
    nodes: RecipeNode[] = [];
    cardsInitialized: boolean = false;

    public ingridientsArr$?: Observable<RecipeNode[]>;
    
    constructor(
        private recipeService: RecipeService, 
        private dragScrollService: DragScrollService, 
        private drawLinesService: DrawLinesService
        ) {
        // this.viewportHeight = window.innerHeight * 1.1; // Set to 80% of the viewport height
    }
    // @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
    // viewportHeight: number;

    @ViewChild('boardDiv') boardDiv!: ElementRef;


    public ngOnInit(): void {
        
        // Place user camera to default position
        setTimeout(() => {
            // this.viewport.scrollToIndex(10); 
            const cellPositionX = (this.gridSize / 2) * this.cellSize;
            const cellPositionY = (this.gridSize / 2) * this.cellSize;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const centerXOffset = viewportWidth * 0.5; // Adjust as 50% of viewport width
            const centerYOffset = viewportHeight * 0.35; // Adjust as 50% of viewport height
            
            // Scroll to center the cell
            window.scrollTo({
              left: cellPositionX - centerXOffset+ this.cellSize / 2,
              top: cellPositionY - centerYOffset + this.cellSize / 2,
            });

        }, 0);
        console.log("initialized");
        

        
        this.ingridientsArr$ = this.recipeService.getRecipe("supercomputer", 20);
        
        this.ingridientsArr$.subscribe((data) => {
            console.log("data", data);
            this.nodes = data;

            this.drawGraph(this.nodes[0], this.boardMiddle);
            this.board[this.boardMiddle.y][this.boardMiddle.x] = this.nodes[0];            
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

        let radius = 2.5;       

        let num_of_ingredients = node.ingredients.length;

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
            radius +=1
        }
        let circle = this.getFullCircleCoordinates(radius, center); 

        // Calculate the angle segment based on the number of ingredients that can fit
        const ingredient_segment = circle_segment / num_of_ingredients;    
    
        for (const [index, ingredientId] of node.ingredients.entries()) {
            const lowerBoundDegree = degrees.lower + index * ingredient_segment;
            const upperBoundDegree = lowerBoundDegree + ingredient_segment;            

            const ingredientNode = this.nodes.find(n => n.id === ingredientId);

            if (ingredientNode) {

                let position = this.getDegreeCoordinate(lowerBoundDegree, upperBoundDegree, circle);
                // If no angle is found in boundaries, increase radius and try again
                while (!position) {
                    radius += 1;
                    circle = this.getFullCircleCoordinates(radius, center);
                    position = this.getDegreeCoordinate(lowerBoundDegree, upperBoundDegree, circle);
                }

                this.board[position.y][position.x] = ingredientNode;
                this.drawGraph(ingredientNode, position, {  lower: lowerBoundDegree, upper: upperBoundDegree });

            }
        }
    }

    private isDragging = false;

    dragStarted(event: CdkDragStart) {
        this.isDragging = true;
        let node = event.source.data;
    }

    drop(event: CdkDragDrop<{ x: number; y: number }>) {
        // Swap positions on the board array
        // console.log("drop", event.item.data);
        // console.log("from", event.previousContainer.data);
        // console.log("to", event.container.data);
        
        
        const previousIndex = event.previousContainer.data;
        const currentIndex = event.container.data;
      
        if (previousIndex !== currentIndex) {
          
          this.board[previousIndex.y][previousIndex.x] = null;
          this.board[currentIndex.y][currentIndex.x] = event.item.data;
        }
        this.isDragging = false;
    }
    
    enterPredicate = (drag: CdkDrag, drop: CdkDropList) => {
        // console.log("enterPredicate", drag.data, drop.data);
        
        return !this.board[drop.data];  // Only allow drop into empty cells
    }


    getDegreeCoordinate(lowerBoundDegree: number, upperBoundDegree: number, circle: { [degree: number]: Position }): Position | null {

        let filteredDegrees = Object.entries(circle).reduce<{ [degree: number]: Position }>((acc, [degree, pos]) => {
            const degreeNum = parseInt(degree);
            if (degreeNum >= lowerBoundDegree && degreeNum <= upperBoundDegree) {
                acc[degreeNum] = pos;
            }
            return acc;
        }, {});

        // Calculate the middle degree
        const middleDegree = (lowerBoundDegree + upperBoundDegree) / 2;

        // Find the closest degree to the middle degree
        let closestDegree: number | null = null;
        let closestDistance = Infinity; // Start with a large distance

        for (const degree in filteredDegrees) {
            const degreeNum = parseInt(degree);
            const distance = Math.abs(degreeNum - middleDegree); // Calculate the distance from the middle degree

            if (distance < closestDistance && this.board[filteredDegrees[degree].y][filteredDegrees[degree].x] === null) {
                closestDistance = distance;
                closestDegree = degreeNum; // Update closest degree
            }
        }

        // Return the position of the closest degree or null if not found
        return closestDegree !== null ? filteredDegrees[closestDegree] : null;
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


    ngAfterViewChecked(): void {
        // Check if cards are initialized and perform jsPlumb logic
        if (this.nodes.length > 0 && !this.cardsInitialized) {
            this.cardsInitialized = true; // Prevent re-initialization
            this.drawLinesService.drawLines(this.nodes
                .map(node => ({
                    id: node.id, 
                    children: node.ingredients ?? [], 
                    parentId: node.parentId ?? -1 
                }))
            );
        }
    }

    @HostListener('transitionend', ['$event'])
    onZoomEnd(event: TransitionEvent) {
        
        // Check if the transition is for the 'transform' property and the element has the 'board' class
        if (event.propertyName === 'transform' && (event.target as HTMLElement).classList.contains('board')) {
            console.log("transitionend in");
            
            this.drawLinesService.redrawLines();
        }
    }


    scale = 1; // Default scale
    scaleStep = 0.1; // Step for zooming in and out

    // Limit zooming between 0.5x and 3x
    minScale = 0.5;
    maxScale = 3;
    private zoomTimeout: any;

    @HostListener('wheel', ['$event'])
    onWheel(event: WheelEvent) {
        this.drawLinesService.hideLines();
        event.preventDefault(); // Prevent the default behavior of scrolling the page
        console.log("wheel");
    
        if (event.deltaY < 0) {
            // Scroll up -> Zoom in
            this.zoomIn();
        } else {
            // Scroll down -> Zoom out
            this.zoomOut();
        }

        if (this.zoomTimeout) {
            clearTimeout(this.zoomTimeout);
        }
        console.log(this.scale);
    }


    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        console.log("keydown");
        
        if (event.key === '+' || event.key === '=') {
            // "+" key -> Zoom in
            this.zoomIn();
        } else if (event.key === '-') {
            // "-" key -> Zoom out
            this.zoomOut();
        } else if ((event.ctrlKey || event.metaKey) && event.key === '0') {
            // Ctrl/Cmd + "0" -> Reset zoom
            this.resetZoom();
        }
    }

    zoomIn() {    
        this.scale = Math.min(this.maxScale, this.scale + this.scaleStep);
        
    }

    zoomOut() {    
        this.scale = Math.max(this.minScale, this.scale - this.scaleStep);
    }

    resetZoom() {
        this.scale = 1; // Reset scale to default
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
