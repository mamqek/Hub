import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { DragDropModule } from '@angular/cdk/drag-drop';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';

import { CardsGridComponent } from './components/cards-grid/cards-grid.component';
import { SatisfactoryCardComponent } from './components/satisfactory-card/satisfactory-card.component';
import { InputDialogComponent } from './components/cards-grid/includes/input-dialog/input-dialog.component';

import { RecipeService } from './services/recipe.service';
import { MatBadgeModule } from '@angular/material/badge';
import { ReadyDirective } from 'app/directives/ready.directive';
import { CapitalizedSnakePipe } from 'app/pipes/capitalized-snake.pipe';
import { BasePathDirective } from 'app/directives/base-path.directive';
import { MatListModule } from '@angular/material/list';
import { IngredientsService } from './services/ingredients.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { OverlayModule } from '@angular/cdk/overlay';


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
        MatDialogModule,
        MatButtonModule,
        MatBadgeModule,
        MatListModule,
        MatExpansionModule,
        OverlayModule,
        InputDialogComponent,
    ],
    providers: [
        RecipeService,
        IngredientsService,
        provideHttpClient(withInterceptorsFromDi())
    ],
})
export class SatisfactoryCalculatorModule { }
