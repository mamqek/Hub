import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { RecipeNode } from '../../services/recipe.service';


import { IngredientsService } from 'app/satisfactory-calculator/services/ingredients.service';

@Component({
  selector: 'satisfactory-card',
  templateUrl: './satisfactory-card.component.html',
  styleUrl: './satisfactory-card.component.scss',
})
export class SatisfactoryCardComponent implements OnInit, OnChanges {

    @Input() data!: RecipeNode;
    @Input() isHighlighted = false;
    @Input() suppressHint = false;
    @Output() selectRecipe = new EventEmitter<void>();

    machineImageUrl: string = 'images/';
    isHintOpen = false;
    private hideHintTimeout: ReturnType<typeof setTimeout> | null = null;
    hintPositions: ConnectedPosition[] = [
        { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 12 },
        { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: 12 },
        { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -12 },
        { originX: 'start', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetX: -12 },
    ];

    constructor(private ingredientsService: IngredientsService) { }

    ngOnInit(): void {
        this.updateMachineImageUrl();
    }

    getItemImageUrl(name: string): string {
        return this.ingredientsService.getItemImageUrl(name);
    }

    showHint() {
        if (this.suppressHint) {
            return;
        }
        if (this.hideHintTimeout) {
            clearTimeout(this.hideHintTimeout);
            this.hideHintTimeout = null;
        }
        this.isHintOpen = true;
    }

    hideHint() {
        if (this.hideHintTimeout) {
            clearTimeout(this.hideHintTimeout);
        }
        // Delay close slightly so moving from node -> hint does not collapse it.
        this.hideHintTimeout = setTimeout(() => {
            this.isHintOpen = false;
            this.hideHintTimeout = null;
        }, 120);
    }

    onSelectRecipeClick(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.selectRecipe.emit();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data']) {
            this.updateMachineImageUrl();
        }

        if (changes['suppressHint']?.currentValue) {
            this.isHintOpen = false;
        }
    }

    private updateMachineImageUrl(): void {
        if (!this.data) {
            this.machineImageUrl = 'images/';
            return;
        }

        this.machineImageUrl = this.ingredientsService.getMachineImageUrl(
            this.data.machineName,
            this.data.itemName,
            this.data.isBaseMaterial
        );
    }
}
