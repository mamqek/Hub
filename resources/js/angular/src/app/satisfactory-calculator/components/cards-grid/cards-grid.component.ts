import { Component,  HostListener, OnInit, ElementRef, Renderer2, ViewChild, ChangeDetectorRef, AfterViewChecked  } from '@angular/core';

import { RecipeService, RecipeNode } from '../../services/recipe.service';
import { DragScrollService } from '../../services/drag-scroll.service';
import { DrawLinesService } from '../../services/draw-lines.service';

import { Observable, Subject, Subscription, fromEvent, throttleTime, map, connect } from 'rxjs';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDragStart, CdkDragMove } from '@angular/cdk/drag-drop';
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
    
    gridSize: number = 50;
    itemSize: number = 50;
    gap: number = 5;
    cellSize: number = this.itemSize + this.gap;
    currentCellSize: number = this.cellSize;
    scrollSubscription: Subscription | null = null;

    board: (RecipeNode | null)[][] = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(null));
    boardMiddle: Position = { x: this.gridSize / 2, y: this.gridSize / 2 };
    nodes: RecipeNode[] = [];
    cardsInitialized: boolean = false;

    public ingridientsArr$?: Observable<RecipeNode[]>;
    
    constructor(
        private recipeService: RecipeService, 
        private dragScrollService: DragScrollService, 
        private drawLinesService: DrawLinesService,
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


    public ngOnInit(): void {
        
        // Place user camera to default position
        setTimeout(() => {

            const boardHeight = this.gridSize * (this.cellSize + 5) - 5; // 5's for gap

            // this.dragScrollService.setViewport(this.viewport);
            // this.dragScrollService.setContentDimensions({ width: boardHeight, height: boardHeight });

            // this.viewport.scrollToIndex(10); 
            const boardMiddlePositionX = boardHeight / 2;
            const boardMiddlePositionY = boardHeight / 2;
            
            const centerXOffset = this.viewportWidth * 0.5; // Adjust as 50% of viewport width
            const centerYOffset = this.viewportHeight * 0.55; // Adjust as 50% of viewport height
            
            // Scroll to center the cell
            window.scrollTo({
                left: boardMiddlePositionX - centerXOffset+ this.cellSize / 2,
                top:  boardMiddlePositionY - centerYOffset + this.cellSize / 2,
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
        

        
        this.ingridientsArr$ = this.recipeService.getRecipe("reinforced iron plate", 10);
        
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

    getDegreeCoordinate(lowerBoundDegree: number, upperBoundDegree: number, circle: { [degree: number]: Position }, random: boolean): Position | null {

        let filteredDegrees = Object.entries(circle).reduce<{ [degree: number]: Position }>((acc, [degree, pos]) => {
            const degreeNum = parseInt(degree);
            
            if (lowerBoundDegree < 0) {
                lowerBoundDegree += 360;
            }

            if (lowerBoundDegree >= upperBoundDegree) {
                upperBoundDegree += 360;
            }
            // console.log("lowerBoundDegree", lowerBoundDegree);
            // console.log("upperBoundDegree", upperBoundDegree);
            
            
            if (degreeNum >= lowerBoundDegree && degreeNum <= upperBoundDegree) {
                acc[degreeNum] = pos;                                                                                           
            }
            return acc;
        }, {});


        // TODO: add some randomness to angle chosement
        // if node has 3 or more ingridients, set its position on edge of circel withn r 5 and give it 360&degr , else go with given angle( for small straight lines)        

        let degrees = Object.keys(filteredDegrees);

        let closestDegree: number | null = null;


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
        
        // Return the position of the closest degree or null if not found
        return closestDegree !== null ? filteredDegrees[closestDegree] : null;
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
            ...(node.parentId ? [node.id] : []), 
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
            console.log("drop", event.item.data);
            this.drawLinesService.removeLinesByElementId(this.nodesWithArrowIdArr);
            let node: RecipeNode = event.item.data;
            let arr = (node.parentId ? [{ id: node.id, children: node.ingredients, parentId: node.parentId }] : [])
                    .concat(node.ingredients ? node.ingredients.map(id => ({ id, children: [], parentId: node.id })) : []);
            
            setTimeout(() => {
                this.drawLinesService.drawLines(arr);
            }, 0);
        }

        this.isDragging = false;
    }
    
    enterPredicate = (drag: CdkDrag, drop: CdkDropList) => {
        // console.log("enterPredicate", drag.data, drop.data);
        
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

    @HostListener('transitionend', ['$event'])
    onZoomEnd(event: TransitionEvent) {
        
        // Check if the transition is for the 'transform' property and the element has the 'board' class
        if (event.propertyName === 'transform' && (event.target as HTMLElement).classList.contains('board')) {
            console.log("transitionend in");
            
            this.drawLinesService.redrawAllLines();
        }
    }



    scale = 1; // Default scale
    scaleStep = 0.1; // Step for zooming in and out

    // Limit zooming between 0.5x and 3x
    minScale = 0.5;
    maxScale = 2;

    @HostListener('wheel', ['$event'])
    onWheel(event: WheelEvent) {
        this.drawLinesService.hideAllLines();
        event.preventDefault(); // Prevent the default behavior of scrolling the page
        if (event.deltaY < 0) {
            // Scroll up -> Zoom in
            this.zoomIn();
        } else {
            // Scroll down -> Zoom out
            this.zoomOut();
        }

        // this.afterZoom();


        console.log(this.scale);
    }


    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        // console.log("keydown");
        
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
        // this.afterZoom();

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




    // FOR VIRTUAL SCROLL

    @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;


    afterZoom() {
        let previousSize = this.currentCellSize;
        this.currentCellSize = this.cellSize * this.scale;
        this.viewport.checkViewportSize();
        console.log(this.currentCellSize);
        this.recenterScroll(previousSize);
    }

    // when zooming out board size decreases by 10%, extra space appears on each side of content wrapper (5%), this affects corectness of virtual scroller rendering, so it behavves incorrectly. board postion and wrapper ize need to be adjusted on zoom
    recenterScroll(previousItemSize: number) {
        const currentScrollOffset = this.viewport.measureScrollOffset('top');
        console.log(this.currentCellSize);
        
        const visibleItemsCount = this.viewport.getViewportSize() / this.currentCellSize;
        console.log("viewportSize", this.viewport.getViewportSize());
        
        console.log("currentScrollOffset", currentScrollOffset);
        
        console.log("visibleItemsCount", visibleItemsCount);
        

        // Calculate the new scroll position to center the content
        const newScrollOffset = (currentScrollOffset / this.currentCellSize) * this.currentCellSize;
        const totalItems = this.viewport.getDataLength();
        console.log("totalItems", totalItems);
        
        const start = this.viewport.getRenderedRange().start;
        const end = this.viewport.getRenderedRange().end;
        console.log(`Rendered range: ${start} - ${end}`);

        const middleItemIndex = start + (end - start) / 2;
        // const middleItemIndex = totalItems / 2;
        console.log("middleItemIndex", middleItemIndex);
        
        // const scrollToPosition = middleItemIndex * this.currentCellSize - (visibleItemsCount * this.currentCellSize) / 2;
        const viewportHeight = this.viewport.getViewportSize();
        const middleItemOffset = middleItemIndex * this.itemSize;
        const scrollToPosition = middleItemOffset - (viewportHeight / 2 - this.itemSize / 2);

        // const scrollToPosition = (currentScrollOffset / previousItemSize) * this.currentCellSize;
        console.log("scrollToPosition", scrollToPosition);
        // this.viewport.scrollToIndex(middleItemIndex, 'smooth'); // Scroll to the new centered position
        this.viewport.scrollToOffset(scrollToPosition); // Scroll to the new centered position
        this.viewport.checkViewportSize(); // Recalculate the layout after scroll
    }

    private logRenderedRange() {
        const height = this.boardDiv.nativeElement.getBoundingClientRect();
        console.log("height", height);
        // Get the rendered range of items
        const renderedRange = this.viewport.getRenderedRange();
        console.log('Rendered range:', renderedRange.start, '-', renderedRange.end);
    }



    



}
