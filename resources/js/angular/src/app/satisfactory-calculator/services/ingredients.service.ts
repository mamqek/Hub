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
}
