import { Component, Input } from '@angular/core';
import { RecipeNode } from '../../services/recipe.service';

@Component({
  selector: 'satisfactory-card',
  templateUrl: './satisfactory-card.component.html',
  styleUrl: './satisfactory-card.component.scss'
})
export class SatisfactoryCardComponent {
    @Input() data!: RecipeNode;
}
