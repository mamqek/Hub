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
import { DrawCircularGraphService } from './services/draw-circular-graph.service';
import { ZoomService } from './services/zoom.service';
import { MatBadgeModule } from '@angular/material/badge';
import { ReadyDirective } from 'app/directives/ready.directive';
import { CapitalizedSnakePipe } from 'app/pipes/capitalized-snake.pipe';
import { BasePathDirective } from 'app/directives/base-path.directive';
import { MatListModule } from '@angular/material/list';
import { IngredientsService } from './services/ingredients.service';
import { MatExpansionModule } from '@angular/material/expansion';


@NgModule({
    declarations: [
        CardsGridComponent,
        SatisfactoryCardComponent,

        BasePathDirective,
        ReadyDirective,
        CapitalizedSnakePipe,
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
        MatListModule,
        MatExpansionModule,
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
