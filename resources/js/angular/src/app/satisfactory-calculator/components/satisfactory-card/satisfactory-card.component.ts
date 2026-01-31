import { Component, Input, OnInit } from '@angular/core';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { RecipeNode } from '../../services/recipe.service';


import {MatBadgeModule} from '@angular/material/badge';
import { IngredientsService } from 'app/satisfactory-calculator/services/ingredients.service';

@Component({
  selector: 'satisfactory-card',
  templateUrl: './satisfactory-card.component.html',
  styleUrl: './satisfactory-card.component.scss',
})
export class SatisfactoryCardComponent implements OnInit {

    @Input() data!: RecipeNode;

    machineImageUrl: string = 'images/';
    isHintOpen = false;
    hintPositions: ConnectedPosition[] = [
        { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 12 },
        { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: 12 },
        { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -12 },
        { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetX: -12 },
    ];

    constructor(private ingredientsService: IngredientsService) { }

    ngOnInit(): void {        
        if (this.data.isBaseMaterial) {
            if (this.data.itemName.includes('Ore') || this.data.itemName.includes('Coal') || this.data.itemName.includes('Lime')) {
                this.machineImageUrl += 'Miner_Mk1.webp';
            } else if (this.data.itemName.includes('Oil')) {
                this.machineImageUrl += 'Oil_Extractor.webp';
            }
        } else {
            this.machineImageUrl += this.data.machineName + '.webp';
        }
    }

    getItemImageUrl(name: string): string {
        return this.ingredientsService.getItemImageUrl(name);
    }

    showHint() {
        this.isHintOpen = true;
    }

    hideHint() {
        this.isHintOpen = false;
    }
}
