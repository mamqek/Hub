import { Component, ChangeDetectionStrategy, ViewChild, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import {FormsModule} from '@angular/forms';
import { Subscription } from 'rxjs';
import { InputNumberComponent } from 'app/input-number/input-number.component';
import { recipeItems } from '../../../../data/recipe-items';
import { RecipeService, Ingredient } from '../../../../services/recipe.service';
import { RecipeDialogStateService, IngredientLimit } from '../../../../services/recipe-dialog-state.service';


@Component({
    selector: 'input-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule, 
        MatButtonModule, 
        MatInputModule, 
        MatFormFieldModule, 
        MatAutocompleteModule,
        InputNumberComponent,
        FormsModule
    ],
    templateUrl: './input-dialog.component.html',
    styleUrl: './input-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputDialogComponent implements OnInit, OnDestroy {
    item: string = '';
    amount: number = 0;
    ingredientQuery: string = '';
    selectedIngredients: IngredientLimit[] = [];

    allItems: string[] = recipeItems.sort((a: string, b: string) => a.localeCompare(b));
    filteredRecipeItems: string[] = [...this.allItems];

    availableIngredients: string[] = [];
    filteredIngredientOptions: string[] = [];
    private selectedRecipeKey: string | null = null;

    private itemIndex = new Map<string, string>();
    private baseIngredientsRequest?: Subscription;

    @ViewChild('recipeTrigger', { read: MatAutocompleteTrigger }) recipeTrigger?: MatAutocompleteTrigger;
    @ViewChild('ingredientTrigger', { read: MatAutocompleteTrigger }) ingredientTrigger?: MatAutocompleteTrigger;

    constructor(
        private dialogRef: MatDialogRef<InputDialogComponent>,
        private dialogState: RecipeDialogStateService,
        private recipeService: RecipeService,
        private cdr: ChangeDetectorRef
    ) {
        this.itemIndex = new Map(this.allItems.map((item) => [this.normalizeName(item), item]));
    }

    ngOnInit() {
        const state = this.dialogState.getState();
        this.item = state.item;
        this.amount = state.amount;
        this.selectedIngredients = state.ingredients.map((ingredient) => ({
            itemName: ingredient.itemName,
            amount: ingredient.amount,
        }));

        this.filterRecipeItems(this.item);
        if (this.item && this.itemIndex.has(this.normalizeName(this.item))) {
            this.loadBaseIngredients(this.item);
        }
    }

    ngOnDestroy() {
        this.baseIngredientsRequest?.unsubscribe();
        this.persistState();
    }

    filterRecipeItems(value: string) {
        const query = (value || '').toLowerCase().trim();
        if (!query) {
            this.filteredRecipeItems = [...this.allItems];
        } else {
            this.filteredRecipeItems = this.allItems.filter((item) => item.toLowerCase().includes(query));
        }

        const normalized = this.normalizeName(value);
        if (this.itemIndex.has(normalized)) {
            this.loadBaseIngredients(value);
        } else {
            this.selectedRecipeKey = null;
            this.availableIngredients = [];
            this.filteredIngredientOptions = [];
        }

        this.persistState();
    }

    openRecipePanel() {
        this.filteredRecipeItems = [...this.allItems];
        this.recipeTrigger?.openPanel();
    }

    onRecipeSelected(value: string) {
        this.item = value;
        this.loadBaseIngredients(value);
        this.persistState();
    }

    filterIngredientOptions(value: string) {
        const query = (value || '').toLowerCase().trim();
        const selectedSet = new Set(this.selectedIngredients.map((ingredient) => this.normalizeName(ingredient.itemName)));

        this.filteredIngredientOptions = this.availableIngredients.filter((ingredient) => {
            if (selectedSet.has(this.normalizeName(ingredient))) {
                return false;
            }

            if (!query) {
                return true;
            }

            return ingredient.toLowerCase().includes(query);
        });
    }

    openIngredientPanel() {
        if (!this.availableIngredients.length) {
            return;
        }
        this.filterIngredientOptions(this.ingredientQuery);
        this.ingredientTrigger?.openPanel();
    }

    onIngredientSelected(value: string) {
        const normalized = this.normalizeName(value);
        const exists = this.selectedIngredients.some(
            (ingredient) => this.normalizeName(ingredient.itemName) === normalized
        );

        if (!exists) {
            this.selectedIngredients.push({ itemName: value, amount: 1 });
        }

        this.ingredientQuery = '';
        this.filterIngredientOptions('');
        this.persistState();
    }

    removeIngredient(name: string) {
        const normalized = this.normalizeName(name);
        this.selectedIngredients = this.selectedIngredients.filter(
            (ingredient) => this.normalizeName(ingredient.itemName) !== normalized
        );
        this.filterIngredientOptions(this.ingredientQuery);
        this.persistState();
    }

    trackIngredient(index: number, ingredient: IngredientLimit): string {
        return ingredient.itemName;
    }

    get useIngredientLimits(): boolean {
        return this.selectedIngredients.length > 0;
    }

    persistState() {
        this.dialogState.saveState({
            item: this.item,
            amount: this.amount,
            ingredients: this.selectedIngredients,
        });
    }

    private loadBaseIngredients(value: string) {
        const normalized = this.normalizeName(value);
        const recipeName = this.itemIndex.get(normalized);

        if (!recipeName) {
            this.selectedRecipeKey = null;
            this.availableIngredients = [];
            this.filteredIngredientOptions = [];
            return;
        }

        if (this.selectedRecipeKey === normalized && this.availableIngredients.length) {
            return;
        }

        this.selectedRecipeKey = normalized;
        this.baseIngredientsRequest?.unsubscribe();
        this.baseIngredientsRequest = this.recipeService.getBaseIngredients(recipeName).subscribe({
            next: (response) => {
                const ingredients = Array.isArray(response?.baseIngredients) ? response.baseIngredients : [];
                this.applyAvailableIngredients(ingredients);
                this.cdr.markForCheck();
            },
            error: () => {
                this.availableIngredients = [];
                this.filteredIngredientOptions = [];
                this.cdr.markForCheck();
            }
        });
    }

    private applyAvailableIngredients(ingredients: Ingredient[]) {
        const ingredientMap = new Map<string, string>();
        for (const ingredient of ingredients) {
            if (!ingredient?.itemName) {
                continue;
            }
            ingredientMap.set(this.normalizeName(ingredient.itemName), ingredient.itemName);
        }

        this.availableIngredients = Array.from(ingredientMap.values()).sort((a, b) => a.localeCompare(b));

        if (this.availableIngredients.length) {
            const allowedSet = new Set(this.availableIngredients.map((ingredient) => this.normalizeName(ingredient)));
            this.selectedIngredients = this.selectedIngredients.filter((ingredient) =>
                allowedSet.has(this.normalizeName(ingredient.itemName))
            );
        } else {
            this.selectedIngredients = [];
        }

        this.filterIngredientOptions(this.ingredientQuery);
        this.persistState();
        this.cdr.markForCheck();
    }

    private normalizeName(value: string): string {
        return value.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    submit() {
        // Close the dialog and pass the data back        
        this.persistState();
        this.dialogRef.close({
            item: this.item, 
            amount: this.amount,
            ingredients: this.selectedIngredients,
        });
    }
}
