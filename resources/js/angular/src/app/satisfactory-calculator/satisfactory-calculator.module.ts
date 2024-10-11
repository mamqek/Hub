    import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';

import { CardsGridComponent } from './components/cards-grid/cards-grid.component';
import { SatisfactoryCardComponent } from './components/satisfactory-card/satisfactory-card.component';
import { InputDialogComponent } from './components/cards-grid/includes/input-dialog/input-dialog.component';

import { RecipeService } from './services/recipe.service';
import { DragScrollService } from './services/drag-scroll.service';
import { DrawLinesService } from './services/draw-lines.service';
import { ReadyDirective } from '../ready.directive';
import { DrawCircularGraphService } from './services/draw-circular-graph.service';
import { ZoomService } from './services/zoom.service';

import { MatBadgeModule } from '@angular/material/badge';
import { IngredientsService } from './services/ingredients.service';


@NgModule({
    declarations: [
        CardsGridComponent,
        SatisfactoryCardComponent,
        
        ReadyDirective,
    ],
    exports: [
        CardsGridComponent,
    ],
    imports: [
        CommonModule,
        DragDropModule,
        ScrollingModule,
        MatDialogModule,
        MatButtonModule,
        MatBadgeModule,
        InputDialogComponent,
    ],
    providers: [
        RecipeService,
        DrawLinesService,
        DragScrollService,
        DrawCircularGraphService,
        ZoomService,
        IngredientsService,
        provideHttpClient(withInterceptorsFromDi())
    ],
})
export class SatisfactoryCalculatorModule { }
