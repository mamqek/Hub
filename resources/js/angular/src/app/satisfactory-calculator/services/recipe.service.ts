import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProducedItem {
    id: number;             // Unique identifier for the item
    itemName: string;      // Name of the item produced
    productionRate: string; // Rate at which the item is produced
}

export interface RecipeNode extends ProducedItem {
    machineName: string;     // Machine used to produce the item
    machineCount: string;    // Number of machines required
    ingredients?: number[];      // Ingridietns recipe id
    byproducts?: number[]; // Optional byproducts of the recipe
    isBaseMaterial?: boolean;    // True if this recipe is for a base material
    indentLevel: number, // Depth level in recipe
}


@Injectable()

export class RecipeService {

    constructor(private _httpClient: HttpClient) { }

    public getRecipe(item: string, amount: number): Observable<RecipeNode[]> {
        // Create HttpParams instance
        let params = new HttpParams()
          .set('item', item)
          .set('amount', amount.toString()); // Convert amount to string
        return this._httpClient.get<RecipeNode[]>('http://localhost:8000/satisfactory/getRecipe', {params});
    }
}


// TODO: use --list-recipes command and pass the recipe onload for each recipe to check whether it has alternative recepies, if so, add an icon to the card to show that it has alternative recipes
// TODO: each card can be cliked and put in that "I already have {number} of this item", query recipe for this amount of item, replace obj with and add ingridient of external input of amount that user has
// 