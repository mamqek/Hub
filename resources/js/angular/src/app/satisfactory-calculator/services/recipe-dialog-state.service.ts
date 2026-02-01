import { Injectable } from '@angular/core';

export interface IngredientLimit {
    itemName: string;
    amount: number;
}

export interface RecipeDialogState {
    item: string;
    amount: number;
    ingredients: IngredientLimit[];
    useIngredientsToMax: boolean;
    selectedRecipes: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class RecipeDialogStateService {
    private state: RecipeDialogState = {
        item: '',
        amount: 0,
        ingredients: [],
        useIngredientsToMax: false,
        selectedRecipes: {},
    };

    getState(): RecipeDialogState {
        return {
            item: this.state.item,
            amount: this.state.amount,
            ingredients: this.state.ingredients.map((ingredient) => ({
                itemName: ingredient.itemName,
                amount: ingredient.amount,
            })),
            useIngredientsToMax: this.state.useIngredientsToMax,
            selectedRecipes: { ...this.state.selectedRecipes },
        };
    }

    saveState(state: RecipeDialogState): void {
        this.state = {
            item: state.item,
            amount: state.amount,
            ingredients: state.ingredients.map((ingredient) => ({
                itemName: ingredient.itemName,
                amount: ingredient.amount,
            })),
            useIngredientsToMax: state.useIngredientsToMax,
            selectedRecipes: { ...state.selectedRecipes },
        };
    }
}
