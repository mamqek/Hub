import { Injectable } from '@angular/core';
import { RecipeService, RecipeNode } from './recipe.service';


interface Position {
    x: number;
    y: number;
};
@Injectable({
  providedIn: null
})
export class DrawCircularGraphService {

  constructor() { }

    board!: (RecipeNode | null)[][];
    boardMiddle!: Position;;
    nodes!: RecipeNode[];


    initGraph(nodes: RecipeNode[], board: (RecipeNode | null)[][]) {
        this.nodes = nodes;
        this.board = board;
        this.boardMiddle = { x: Math.floor(this.board[0].length / 2), y: Math.floor(this.board.length / 2) };

        this.board[this.boardMiddle.y][this.boardMiddle.x] = this.nodes[0];            
        this.drawGraph(this.nodes[0], this.boardMiddle);
        return this.board;

        // let triangleCircle : { [degree: number]: Position } = this.getFullCircleCoordinates(4.5, this.boardMiddle);
        // console.log("getFullCircleCoordinatesTriangle", triangleCircle );
        // for (const [degree, pos] of Object.entries(triangleCircle)) {
        //     this.board[pos.y][pos.x] = { id: parseInt(degree), itemName: degree, machineCount: "5.00", machineName: "Assembler", productionRate: "10.00", ingredients: [1, 9], indentLevel: 0 };
        // }
    }

    clearBoard(board: (RecipeNode | null)[][]) {
        for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[0].length; col++) {
                board[row][col] = null;
            }
        }
        console.log("Board cleared", board);        
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
                    console.log("Special settings for 2 ingridient recepy", ingredientNode.itemName);
                } else if (ingredientNode.indentLevel == 1) {   // Main ingridients usually have long process, so move them away 
                    // radius += 2;
                    random = false; 
                } else if (num_of_ingredients > 1) {            // Randomize angle if many ingredients, so they are not in a straight line
                    random = true;
                }
                
                let ingredientNodeIngridients: number[] | undefined = ingredientNode.ingredients;
                if (ingredientNodeIngridients && ingredientNodeIngridients.length > 1) {
                    radius += ingredientNodeIngridients.length -1 ;                                                            
                }

                if (ingredientNode.indentLevel == 1) {   // Main ingridients usually have long process, so move them away 
                    console.log("Main ingridient", ingredientNode.itemName);
                    console.log(radius);
                    console.log(lowerBoundDegree);
                    console.log(upperBoundDegree);
                    console.log(random);
                    
                }

                if (radius <= 1.5) {
                    console.warn("Radius is negative, increasing...");
                    radius = 2.5;
                } else if (radius > 10) {
                    console.warn("Radius is too large, decreasing...");
                    radius = 2.5;
                }

                
                let circle = this.getFullCircleCoordinates(radius, center);
                let position = this.getDegreeCoordinate(lowerBoundDegree, upperBoundDegree, circle, random);
                
                // TODO: check this on computer recipe, keeps lagging. set a limiter at least and give error, so it doesnt crash tab in infinite loop 
                let attempts = 0;
                // If no angle is found in boundaries, increase radius and try again
                while (!position && attempts < 10) {
                    console.warn("No position found, increasing radius...");
                    
                    lowerBoundDegree -= ingredient_segment / 2;
                    upperBoundDegree += ingredient_segment / 2;
                    circle = this.getFullCircleCoordinates(radius, center);
                    console.log(lowerBoundDegree);
                    console.log(upperBoundDegree);
                    position = this.getDegreeCoordinate(lowerBoundDegree, upperBoundDegree, circle, random);
                    attempts++;
                }

                if (position === null) {
                    console.error("Failed to find position for", ingredientNode.itemName, "after 10 attempts.");
                    return;
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
        console.log("closestDegree", closestDegree);
        
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
            console.error("Out of bounds");
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



}
