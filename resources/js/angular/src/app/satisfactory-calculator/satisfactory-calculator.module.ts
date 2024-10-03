import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { DragDropModule } from '@angular/cdk/drag-drop'; // Import DragDropModule
import { ScrollingModule } from '@angular/cdk/scrolling';

import { CardsGridComponent } from './components/cards-grid/cards-grid.component';
import { SatisfactoryCardComponent } from './components/satisfactory-card/satisfactory-card.component';

import { RecipeService } from './services/recipe.service';
import { DragScrollService } from './services/drag-scroll.service';
import { DrawLinesService } from './services/draw-lines.service';



@NgModule({
    declarations: [
        CardsGridComponent,
        SatisfactoryCardComponent,
    ],
    exports: [
        CardsGridComponent,
    ],
    imports: [
        CommonModule,
        DragDropModule,
        ScrollingModule,
    ],
    providers: [
        RecipeService,
        DrawLinesService,
        DragScrollService,
        provideHttpClient(withInterceptorsFromDi())
    ],
})
export class SatisfactoryCalculatorModule { }
