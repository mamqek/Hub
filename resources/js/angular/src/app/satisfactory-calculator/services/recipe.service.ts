import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, tap, Observable, Subject, switchMap, takeUntil, Subscription, fromEvent, throttleTime, map, connect } from 'rxjs';
import { environment } from '../../../../src/environments/environment';

export interface ProducedItem {
    id: number;             // Unique identifier for the item   
    itemName: string;      // Name of the item produced
    productionRate: string; // Rate at which the item is produced
}

export interface RecipeNode extends ProducedItem {
    recipeName?: string;      // Recipe used to produce this item
    cardColor?: string;       // Visual color used in graph card
    machineName: string;     // Machine used to produce the item
    machineCount: number;    // Number of machines required
    ingredients?: number[];      // Ingridietns recipe id
    byproducts?: ProducedItem[]; // Optional byproducts of the recipe
    isBaseMaterial?: boolean;    // True if this recipe is for a base material
    indentLevel: number, // Depth level in recipe
    parentId?: number;    // Parent recipe id
}

export interface Ingredient {
    itemName: string;
    amount: number;
}

export interface OptimizationGoal {
    type: string;
    target: string;
}

export interface IngredientsData {
    input: Ingredient[];
    intermediate: Ingredient[];
    output: Ingredient[];
    byproduct: Ingredient[];
}

export interface BaseIngredientsResponse {
    item: string;
    baseIngredients: Ingredient[];
    recipeOptions?: Record<string, string[]>;
}

export interface RecipeResponse {
    ingredientsData: IngredientsData;
    recipeNodeArr: RecipeNode[];
    recipeOptions?: Record<string, string[]>;
}



@Injectable()

// TODO: add recepies to be able to count resources required per generator to reach certain power. user sets generator type and amount of power, then we count resources recepies

export class RecipeService {

    private inputSubject = new BehaviorSubject<{ item: string; amount: number }>({ item: 'supercomputer', amount: 10 });
    public recipeNodes$ = new BehaviorSubject<RecipeResponse>({recipeNodeArr: [], ingredientsData: {input: [], output: [], intermediate: [], byproduct: []}});
    private unsubscribe$ = new Subject<void>();

    constructor(private _httpClient: HttpClient) { }

    public getRecipe(
        item: string,
        amount: number,
        selectedRecipes?: Record<string, string>,
        optimizationGoals?: OptimizationGoal[]
    ): Observable<RecipeResponse> {
        let params = new HttpParams()
            .set('item', item)
            .set('amount', amount.toString());         
        if (selectedRecipes && Object.keys(selectedRecipes).length > 0) {
            params = params.set('selectedRecipes', JSON.stringify(selectedRecipes));
        }
        if (optimizationGoals && optimizationGoals.length > 0) {
            params = params.set('optimizationGoals', JSON.stringify(optimizationGoals.map((goal) => [goal.type, goal.target])));
        }
        return this._httpClient.get<RecipeResponse>(`${environment.apiBaseUrl}/satisfactory/getRecipe`, { params });
    }

    public getBaseIngredients(
        item: string,
        amount?: number,
        selectedRecipes?: Record<string, string>,
        optimizationGoals?: OptimizationGoal[]
    ): Observable<BaseIngredientsResponse> {
        let params = new HttpParams().set('item', item);
        if (amount !== undefined) {
            params = params.set('amount', amount.toString());
        }
        if (selectedRecipes && Object.keys(selectedRecipes).length > 0) {
            params = params.set('selectedRecipes', JSON.stringify(selectedRecipes));
        }
        if (optimizationGoals && optimizationGoals.length > 0) {
            params = params.set('optimizationGoals', JSON.stringify(optimizationGoals.map((goal) => [goal.type, goal.target])));
        }

        return this._httpClient.get<BaseIngredientsResponse>(`${environment.apiBaseUrl}/satisfactory/getBaseIngredients`, { params });
    }

    public getRecipeWithLimits(
        item: string,
        ingredients: Ingredient[],
        amount?: number,
        useIngredientsToMax?: boolean,
        selectedRecipes?: Record<string, string>,
        optimizationGoals?: OptimizationGoal[]
    ): Observable<RecipeResponse> {
        const body = {
            item,
            ingredients,
            amount,
            useIngredientsToMax,
            selectedRecipes,
            optimizationGoals: optimizationGoals?.map((goal) => [goal.type, goal.target]) || [],
        };
        return this._httpClient.post<RecipeResponse>(`${environment.apiBaseUrl}/satisfactory/getRecipeWithLimits`, body);
    }

    public setupRecipeFetching(): Observable<RecipeResponse> {
        return this.inputSubject.pipe(
            takeUntil(this.unsubscribe$),
            switchMap(input => {
                return this.getRecipe(input.item, input.amount).pipe(
                    tap(data => {
                        this.recipeNodes$.next(data);
                        console.log(data);
                        
                    }),
                )
            })
        );
    }
    // TODO: Somehow sort items in intermidiete ingridients so final item is on top, then his children and so on
    public updateInput(item: string, amount: number) {
        this.inputSubject.next({ item, amount });
    }

    // Expose the ingredients observable for other components to subscribe to
    public getRecipeObservable(): Observable<RecipeResponse> {
        return this.recipeNodes$.asObservable(); 
    }

    public getRecipeValue(): RecipeResponse {
        return this.recipeNodes$.getValue();
    }

    public unsubscribe() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
        this.unsubscribe$ = new Subject<void>();
    }
}


// TODO: use --list-recipes command and pass the recipe onload for each recipe to check whether it has alternative recepies, if so, add an icon to the card to show that it has alternative recipes
// TODO: each card can be cliked and put in that "I already have {number} of this item", query recipe for this amount of item, replace obj with and add ingridient of external input of amount that user has
// 
