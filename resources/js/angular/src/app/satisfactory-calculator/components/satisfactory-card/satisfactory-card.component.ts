import { Component, Input, OnInit, AfterContentInit, OnDestroy } from '@angular/core';
import { RecipeNode } from '../../services/recipe.service';

import { IngredientsService } from 'app/satisfactory-calculator/services/ingredients.service';

@Component({
  selector: 'satisfactory-card',
  templateUrl: './satisfactory-card.component.html',
  styleUrl: './satisfactory-card.component.scss',
})
export class SatisfactoryCardComponent implements OnInit {

    @Input() data!: RecipeNode;
    imageUrl: string = 'http://localhost:8000/images/';

    ngOnInit(): void {
        if (this.data.isBaseMaterial) {
            if (this.data.itemName.includes('Ore')) {
                this.imageUrl += 'Miner_Mk1.webp';
            } else if (this.data.itemName.includes('Oil')) {
                this.imageUrl += 'Oil_Extractor.webp';
            }
        } else if (this.data.byproducts) {

        } else {
            this.imageUrl += this.data.machineName + '.webp';
        }
        // console.log('Card initialized:', this.data);
        // Here you can emit an event or call a service to notify the parent component if needed

    getItemImageUrl(name: string): string {
        return this.ingredientsService.getItemImageUrl(name);
    }
}
