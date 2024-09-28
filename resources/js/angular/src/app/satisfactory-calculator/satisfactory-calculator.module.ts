import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { DragDropModule } from '@angular/cdk/drag-drop'; // Import DragDropModule
import { CardsGridComponent } from './components/cards-grid/cards-grid.component';

import { RecipeService } from './services/recipe.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { SatisfactoryCardComponent } from './components/satisfactory-card/satisfactory-card.component';



@NgModule({
    declarations: [
        CardsGridComponent,
        SatisfactoryCardComponent,
    ],
    exports: [
        CardsGridComponent
    ],
    imports: [
        CommonModule,
        DragDropModule,
    ],
    providers: [
        RecipeService,
        provideHttpClient(withInterceptorsFromDi())
    ],
})
export class SatisfactoryCalculatorModule { }
