import { Component, OnInit } from '@angular/core';
import { RecipeService, RecipeNode } from '../../services/recipe.service';
import { Observable, Subject } from 'rxjs';
import { CdkDragDrop, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';


@Component({
  selector: 'cards-grid',
  templateUrl: './cards-grid.component.html',
  styleUrl: './cards-grid.component.scss'
})
export class CardsGridComponent implements OnInit {
    
    board: (RecipeNode| null)[] = Array(700).fill(null); // Use null or empty object for unoccupied cells

    public ingridientsArr$?: Observable<RecipeNode[]>;
    
    constructor(private recipeService: RecipeService) { }
    
    public ngOnInit(): void {
        console.log("initialized");
        
        this.ingridientsArr$ = this.recipeService.getRecipe("supercomputer", 10);

        this.ingridientsArr$.subscribe((data) => {
            // either 2 dimensonal array to put intnd_level as a row
            // or dynamicaly set amount of colemns based on recepy, amd count index by full/2 = middle
            data.forEach((element) => {
                console.log(element);
                this.board[element.id] = element;
            });
        });
        
        console.log(this.ingridientsArr$);
        
                    // Initial placement of nodes
    }

    drop(event: CdkDragDrop<number>) {
        // Swap positions on the board array
        console.log("drop", event.item.data);
        console.log("from", event.previousContainer.data);
        console.log("to", event.container.data);
        
        
        const previousIndex = event.previousContainer.data;
        const currentIndex = event.container.data;
      
        if (previousIndex !== currentIndex) {
          // Swap logic for the board
          this.board[previousIndex] = null;
          this.board[currentIndex] = event.item.data;
        }
    }
    
    enterPredicate = (drag: CdkDrag, drop: CdkDropList) => {
        console.log("enterPredicate", drag.data, drop.data);
        
        return !this.board[drop.data];  // Only allow drop into empty cells
    }
    
}
