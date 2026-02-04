import { Injectable } from '@angular/core';
import { CapitalizedSnakePipe } from 'app/pipes/capitalized-snake.pipe';

@Injectable({
  providedIn: 'root'
})
export class IngredientsService {

    private capitalizedSnakePipe: CapitalizedSnakePipe = new CapitalizedSnakePipe();


    constructor() { }

    getItemImageUrl(name: string): string {
        return 'images/items/' + this.capitalizedSnakePipe.transform(name) + '.png';
    }

    getMachineImageUrl(machineName: string, itemName?: string, isBaseMaterial?: boolean): string {
        if (isBaseMaterial && itemName) {
            if (itemName.includes('Ore') || itemName.includes('Coal') || itemName.includes('Lime')) {
                return 'images/Miner_Mk1.webp';
            }
            if (itemName.includes('Oil')) {
                return 'images/Oil_Extractor.webp';
            }
        }

        const normalizedMachineName = `${machineName || ''}`.trim().replace(/\s+/g, '_');
        return `images/${normalizedMachineName}.webp`;
    }
}
