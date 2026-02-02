import { Injectable } from '@angular/core';
import { OptimizationGoal } from './recipe.service';

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
    optimizationGoals: OptimizationGoal[];
}

@Injectable({ providedIn: 'root' })
export class RecipeDialogStateService {
    private state: RecipeDialogState = {
        item: '',
        amount: 0,
        ingredients: [],
        useIngredientsToMax: false,
        selectedRecipes: {},
        optimizationGoals: [],
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
            optimizationGoals: this.state.optimizationGoals.map((goal) => ({ ...goal })),
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
            optimizationGoals: state.optimizationGoals.map((goal) => ({ ...goal })),
        };
    }
}
