import { Component,  HostListener, OnInit, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef, AfterViewChecked  } from '@angular/core';
import { RecipeService, RecipeNode } from '../../services/recipe.service';
import { Observable, Subject, Subscription, fromEvent, throttleTime, map, connect } from 'rxjs';
import { CdkDragDrop, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { jsPlumb } from 'jsplumb';
import { SatisfactoryCardComponent } from '../satisfactory-card/satisfactory-card.component';
import { BaseNodeComponent } from "jsplumbtoolkit-angular"

interface Position {
    x: number;
    y: number;
};

@Component({
  selector: 'cards-grid',
  templateUrl: './cards-grid.component.html',
  styleUrl: './cards-grid.component.scss'
})
export class CardsGridComponent implements OnInit, AfterViewInit, AfterViewChecked  {
    
    size: number = 50;

    board: (RecipeNode | null)[][] = Array.from({ length: this.size }, () => Array(this.size).fill(null));
    boardMiddle: Position = { x: this.size / 2, y: this.size / 2 };
    data: RecipeNode[] = [];
    cardsInitialized: boolean = false;

    public ingridientsArr$?: Observable<RecipeNode[]>;
    
    constructor(private recipeService: RecipeService, private cdr: ChangeDetectorRef, private el: ElementRef) { 

    }

    @ViewChild('boardDiv') boardDiv!: ElementRef;


    private instance: any;
    private redrawConnections(): void {
        this.instance.repaintEverything();
    }




    public ngOnInit(): void {



        window.addEventListener('load', () => {
        setTimeout(() => {
            // console.log("Initial scroll position after page load", window.scrollY);

            window.scrollTo(0, 0); // Force scroll position to 0,0 after reload
            // console.log("Initial scroll position after page load", window.scrollY);        
          }, 0);
        });
        console.log("initialized");
        
        this.ingridientsArr$ = this.recipeService.getRecipe("modular frame", 10);
        
        this.ingridientsArr$.subscribe((data) => {
            console.log("data", data);
            this.data = data;
            // either 2 dimensonal array to put intnd_level as a row
            // or dynamicaly set amount of colemns based on recepy, amd count index by full/2 = middle
            data.forEach((element) => {
                console.log(element);
                // this.board[middleHeight][middleWidth +  element.id] = element;
                
            });
            this.drawGraph(data[0], data);
            this.board[this.boardMiddle.y][this.boardMiddle.y] = data[0];
            console.log("end subscribe");
            
        });
            
        // Initial placement of nodes

        this.setupScrollListener();


        let circle : { [degree: number]: Position } = this.getFullCircleCoordinates(5);
        



        // let pos = getDegreeCoordinate(115, 150, circle, this.board) ?? { x: 0, y: 0 };
        // console.log("getDegreeCoordinate", pos);
        // this.board[pos.y][pos.x] = { id: 1, itemName: "1", machineCount: "5.00", machineName: "Assembler", productionRate: "10.00", ingredients: [1, 9], indentLevel: 0 };


        
        console.log("getFullCircleCoordinates", circle );
        // for (const [degree, pos] of Object.entries(circle)) {
        //     this.board[pos.y][pos.x] = { id: parseInt(degree), itemName: degree, machineCount: "5.00", machineName: "Assembler", productionRate: "10.00", ingredients: [1, 9], indentLevel: 0 };
        // }
    }


    drawGraph (node: RecipeNode, data: RecipeNode[], degrees: {upper: number, lower: number} = {upper: 360, lower: 0}) {
        if (!node.ingredients || !Array.isArray(node.ingredients)) {
            return; // Exit if ingredients is undefined or not an array
        }

        let level = node.indentLevel + 3;
        let circle = this.getFullCircleCoordinates(level + 2);

        let num_of_ingredients = node.ingredients.length;
        let circle_segment = degrees.upper - degrees.lower;
        let ingredient_segment = circle_segment / num_of_ingredients;

        for (const [index, ingredientId] of node.ingredients.entries()) {
            const lowerBoundDegree = degrees.lower + index * ingredient_segment;
            const upperBoundDegree = lowerBoundDegree + ingredient_segment;

            const ingredientNode = data.find(n => n.id === ingredientId);
            if (ingredientNode) {
                const position = this.getDegreeCoordinate(lowerBoundDegree, upperBoundDegree, circle);
                if (position) {
                    this.board[position.y][position.x] = ingredientNode;
                    this.drawGraph(ingredientNode, data, { upper: upperBoundDegree, lower: lowerBoundDegree });
                } else {
                    console.error("Could not find position for ingredient", ingredientNode);
                }
            }
        }
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

    getFullCircleCoordinates(radius: number): { [degree: number]: Position } {
        const circleCoords: { [degree: number]: Position } = {};
    
        // Calculate the number of points based on the circumference of the circle
        const circumference = 2 * Math.PI * radius + 0.5;
    
        // Set the step dynamically based on the circumference (this ensures no overlapping)
        const degreeStep = Math.max(1, Math.round(360 / circumference));
     
        for (let degree = 0; degree < 360; degree += degreeStep) {
            const angleInRadians = ((360 - degree) * Math.PI) / 180;
    
            // Calculate x and y coordinates and round them to the nearest integer
            const x = Math.round(this.boardMiddle.x + radius * Math.cos(angleInRadians));
            const y = Math.round(this.boardMiddle.y + radius * Math.sin(angleInRadians));
    
            // Avoid adding duplicate coordinates by checking if they already exist
            const coordExists = Object.values(circleCoords).some(pos => pos.x === x && pos.y === y);
            if (!coordExists) {
                circleCoords[degree] = { x, y };
            }
        }
    
        return circleCoords;
    }

    ngAfterViewInit() {
        const divElement = this.boardDiv.nativeElement;

        const computedStyle = window.getComputedStyle(divElement);
        const cssWidth = parseFloat(computedStyle.width);
        const cssHeight = parseFloat(computedStyle.height); 
        // console.log("CSS width:", cssWidth);
        // console.log("CSS cssHeight:", cssHeight);
        this.position.x = -(cssWidth / 2);
        this.position.y = -(cssHeight / 2); 

        this.cdr.detectChanges(); // Notify Angular that changes have been made
        console.log("ngAfterViewInit");        
    }

    ngAfterViewChecked(): void {
        // Check if cards are initialized and perform jsPlumb logic
        if (this.data.length > 0 && !this.cardsInitialized) {
            this.plumb();
            this.cardsInitialized = true; // Prevent re-initialization
        }
    }

    plumb () {
        
        this.instance = jsPlumb.getInstance({
            Container: this.el.nativeElement
        });

        // this.instance = jsPlumb.getInstance({
        //     Container: 'jsplumb-canvas',
        //     Connector: ['Flowchart', { cornerRadius: 5 }],
        //     Endpoint: ['Dot', { radius: 5 }],
        //     PaintStyle: { stroke: '#456', strokeWidth: 2 },
        //     Anchors: ['Continuous', 'Continuous']
        //   });
        
        const box1 = document.getElementById("card-0");
        const box2 = document.getElementById("card-1");
        console.log("box1", box1);
        console.log("box2", box2);
        
    
        this.instance.draggable(box1);
        this.instance.draggable(box2);
    
        this.instance.connect({
          source: box1,
          target: box2,
          connector: "Straight",
        //   anchor: "Continuous",
        //   endpoint: "Dot",
        //   paintStyle: { stroke: "blue", strokeWidth: 3 },
        //   overlays: [["Arrow", { width: 10, length: 10, location: 1 }]]
        });
    
        // this.instance.bind("connectionDragStop", () => {
        //   this.redrawConnections();
        // });
    
        // this.instance.bind("endpointDragStop", () => {
        //   this.redrawConnections();
        // });
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
    }
    
    enterPredicate = (drag: CdkDrag, drop: CdkDropList) => {
        // console.log("enterPredicate", drag.data, drop.data);
        
        return !this.board[drop.data];  // Only allow drop into empty cells
    }
    



    scale = 1;
    position = { x: 0, y: 0 };
    isDragging = false;
    dragStart = { x: 0, y: 0 };
    mouseMoveSubscription: Subscription | null = null;
    mouseUpSubscription: Subscription | null = null;
  
    setupScrollListener() {
      const scroll$: Observable<number> = fromEvent(window, 'scroll').pipe(
        throttleTime(50),  
        map(() => window.scrollY ),
        map(scrollY => Math.max(0.7, 1.5 - scrollY / 1000))
      );
    //   console.log(" scrolls", window.scrollY);
      
    //   scroll$.subscribe(newScale => {
    //   console.log(" scrolls", window.scrollY);

    //     console.log("newScale", newScale);
        
    //     this.scale = newScale;
    //   });
    }
  
    onMouseDown(event: MouseEvent) {
      if (event.button === 2) { // Right-click
        event.preventDefault()
        this.isDragging = true;
        this.dragStart.x = event.clientX - this.position.x;
        this.dragStart.y = event.clientY - this.position.y;
        
      // Throttle mousemove event to limit frequency of position updates
      this.mouseMoveSubscription = fromEvent<MouseEvent>(document, 'mousemove')
        .subscribe(moveEvent => this.onMouseMove(moveEvent));

        this.mouseUpSubscription = fromEvent(document, 'mouseup').subscribe(() => this.onMouseUp());
      }
    }
  
    onMouseMove(event: MouseEvent) {
        // console.log("onMouseMove", event);
        
      if (this.isDragging) {
        // console.log(this.dragStart);
        // console.log(this.position);
        // console.log("clientX" + event.clientX);
        // console.log("clientY" + event.clientY);
        
        this.position.x = event.clientX - this.dragStart.x;
        this.position.y = event.clientY - this.dragStart.y;
      }
    }
  
    onMouseUp() {
        this.isDragging = false;
    
        // Unsubscribe from mousemove and mouseup events
        if (this.mouseMoveSubscription) {
          this.mouseMoveSubscription.unsubscribe();
          this.mouseMoveSubscription = null;
        }
    
        if (this.mouseUpSubscription) {
          this.mouseUpSubscription.unsubscribe();
          this.mouseUpSubscription = null;
        }
      }

    @HostListener('document:contextmenu', ['$event'])
    disableContextMenu(event: MouseEvent) {
    event.preventDefault();
    }

}
