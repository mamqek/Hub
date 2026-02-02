import { Component, ChangeDetectionStrategy, ViewChild, OnInit, OnDestroy, ChangeDetectorRef, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { InputNumberComponent } from 'app/input-number/input-number.component';
import { recipeItems } from '../../../../data/recipe-items';
import { RecipeService, Ingredient, OptimizationGoal } from '../../../../services/recipe.service';
import { RecipeDialogStateService, IngredientLimit } from '../../../../services/recipe-dialog-state.service';

interface RecipeDialogData {
    item?: string;
    selectedRecipes?: Record<string, string>;
    optimizationGoals?: OptimizationGoal[];
}

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
        MatSelectModule,
        MatCheckboxModule,
        DragDropModule,
        InputNumberComponent,
        FormsModule,
    ],
    templateUrl: './input-dialog.component.html',
    styleUrl: './input-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputDialogComponent implements OnInit, OnDestroy {
    item = '';
    amount = 0;
    ingredientQuery = '';
    selectedIngredients: IngredientLimit[] = [];
    useIngredientsToMax = false;

    selectedRecipes: Record<string, string> = {};
    recipeOptions: Record<string, string[]> = {};
    selectedMainRecipe = '';
    optimizationGoals: OptimizationGoal[] = [];
    selectedGoalType = 'minimize_item_input';
    goalTarget = '';
    filteredGoalTargets: string[] = [];

    readonly goalTypes: Array<{ value: string; label: string }> = [
        { value: 'maximize_item_output', label: 'Maximize item output' },
        { value: 'minimize_item_output', label: 'Minimize item output' },
        { value: 'maximize_item_input', label: 'Maximize item input' },
        { value: 'minimize_item_input', label: 'Minimize item input' },
        { value: 'maximize_item_consumption', label: 'Maximize item consumption' },
        { value: 'minimize_item_consumption', label: 'Minimize item consumption' },
        { value: 'maximize_item_production', label: 'Maximize item production' },
        { value: 'minimize_item_production', label: 'Minimize item production' },
        { value: 'maximize_recipe', label: 'Maximize recipe usage' },
        { value: 'minimize_recipe', label: 'Minimize recipe usage' },
    ];

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
        private cdr: ChangeDetectorRef,
        @Optional() @Inject(MAT_DIALOG_DATA) private data: RecipeDialogData | null
    ) {
        this.itemIndex = new Map(this.allItems.map((item) => [this.normalizeName(item), item]));
    }

    ngOnInit() {
        const state = this.dialogState.getState();
        this.item = this.data?.item ?? state.item;
        this.amount = state.amount;
        this.selectedIngredients = state.ingredients.map((ingredient) => ({
            itemName: ingredient.itemName,
            amount: ingredient.amount,
        }));
        this.useIngredientsToMax = state.useIngredientsToMax;

        this.selectedRecipes = {
            ...state.selectedRecipes,
            ...(this.data?.selectedRecipes ?? {}),
        };
        this.optimizationGoals = [
            ...state.optimizationGoals.map((goal) => ({ ...goal })),
            ...((this.data?.optimizationGoals ?? []).map((goal) => ({ ...goal }))),
        ];

        this.filterRecipeItems(this.item);
        this.filterGoalTargets('');
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
            this.recipeOptions = {};
            this.selectedMainRecipe = '';
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
        this.syncUseMaxState();
        this.persistState();
    }

    removeIngredient(name: string) {
        const normalized = this.normalizeName(name);
        this.selectedIngredients = this.selectedIngredients.filter(
            (ingredient) => this.normalizeName(ingredient.itemName) !== normalized
        );
        this.filterIngredientOptions(this.ingredientQuery);
        this.syncUseMaxState();
        this.persistState();
    }

    trackIngredient(index: number, ingredient: IngredientLimit): string {
        return ingredient.itemName;
    }

    get useIngredientLimits(): boolean {
        return this.selectedIngredients.length > 0;
    }

    get mainRecipeOptions(): string[] {
        const canonicalItem = this.itemIndex.get(this.normalizeName(this.item)) ?? this.item;
        if (this.recipeOptions[canonicalItem]) {
            return this.recipeOptions[canonicalItem];
        }
        const normalized = this.normalizeName(canonicalItem);
        const key = Object.keys(this.recipeOptions).find((candidate) => this.normalizeName(candidate) === normalized);
        return key ? this.recipeOptions[key] : [];
    }

    onMainRecipeChange(value: string) {
        const canonicalItem = this.itemIndex.get(this.normalizeName(this.item)) ?? this.item;
        const recipeName = `${value || ''}`.trim();
        if (!recipeName) {
            delete this.selectedRecipes[canonicalItem];
            this.selectedMainRecipe = '';
        } else {
            this.selectedRecipes[canonicalItem] = recipeName;
            this.selectedMainRecipe = recipeName;
        }
        this.loadBaseIngredients(canonicalItem);
        this.persistState();
    }

    persistState() {
        this.dialogState.saveState({
            item: this.item,
            amount: this.amount,
            ingredients: this.selectedIngredients,
            useIngredientsToMax: this.useIngredientsToMax,
            selectedRecipes: this.selectedRecipes,
            optimizationGoals: this.optimizationGoals,
        });
    }

    addOptimizationGoal() {
        const target = `${this.goalTarget || ''}`.trim();
        if (!target) {
            return;
        }
        this.optimizationGoals.push({ type: this.selectedGoalType, target });
        this.goalTarget = '';
        this.filterGoalTargets('');
        this.persistState();
    }

    removeOptimizationGoal(index: number) {
        if (index < 0 || index >= this.optimizationGoals.length) {
            return;
        }
        this.optimizationGoals.splice(index, 1);
        this.persistState();
    }

    dropOptimizationGoal(event: CdkDragDrop<OptimizationGoal[]>) {
        if (event.previousIndex === event.currentIndex) {
            return;
        }
        moveItemInArray(this.optimizationGoals, event.previousIndex, event.currentIndex);
        this.persistState();
    }

    filterGoalTargets(value: string) {
        const query = (value || '').toLowerCase().trim();
        if (!query) {
            this.filteredGoalTargets = [...this.allItems];
            return;
        }
        this.filteredGoalTargets = this.allItems.filter((item) => item.toLowerCase().includes(query));
    }

    onGoalTargetSelected(value: string) {
        this.goalTarget = value;
        this.filterGoalTargets(value);
    }

    private loadBaseIngredients(value: string) {
        const normalized = this.normalizeName(value);
        const recipeName = this.itemIndex.get(normalized);

        if (!recipeName) {
            this.selectedRecipeKey = null;
            this.availableIngredients = [];
            this.filteredIngredientOptions = [];
            this.recipeOptions = {};
            this.selectedMainRecipe = '';
            return;
        }

        this.selectedRecipeKey = normalized;
        this.baseIngredientsRequest?.unsubscribe();
        this.baseIngredientsRequest = this.recipeService.getBaseIngredients(
            recipeName,
            undefined,
            this.selectedRecipes,
            this.optimizationGoals
        ).subscribe({
            next: (response) => {
                const ingredients = Array.isArray(response?.baseIngredients) ? response.baseIngredients : [];
                this.applyAvailableIngredients(ingredients);
                this.recipeOptions = response?.recipeOptions ?? {};
                this.syncMainRecipeSelection(recipeName);
                this.cdr.markForCheck();
            },
            error: () => {
                this.availableIngredients = [];
                this.filteredIngredientOptions = [];
                this.recipeOptions = {};
                this.selectedMainRecipe = '';
                this.cdr.markForCheck();
            },
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

        this.syncUseMaxState();
        this.filterIngredientOptions(this.ingredientQuery);
        this.persistState();
        this.cdr.markForCheck();
    }

    private syncMainRecipeSelection(recipeName: string) {
        const normalized = this.normalizeName(recipeName);
        const canonicalItem = this.itemIndex.get(normalized) || recipeName;
        const options = this.recipeOptions[canonicalItem] ?? [];
        const selected = this.selectedRecipes[canonicalItem];

        if (selected && options.includes(selected)) {
            this.selectedMainRecipe = selected;
            return;
        }

        this.selectedMainRecipe = options[0] ?? '';
        if (this.selectedMainRecipe) {
            this.selectedRecipes[canonicalItem] = this.selectedMainRecipe;
        }
    }

    private normalizeName(value: string): string {
        return value.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    submit() {
        this.persistState();
        this.dialogRef.close({
            item: this.item,
            amount: this.amount,
            ingredients: this.selectedIngredients,
            useIngredientsToMax: this.useIngredientsToMax,
            selectedRecipes: this.selectedRecipes,
            optimizationGoals: this.optimizationGoals,
        });
    }

    private syncUseMaxState() {
        if (!this.selectedIngredients.length) {
            this.useIngredientsToMax = false;
        }
    }
}
