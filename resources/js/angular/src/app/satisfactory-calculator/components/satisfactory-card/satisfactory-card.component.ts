import { Component, Input, OnInit } from '@angular/core';
import { RecipeNode } from '../../services/recipe.service';

@Component({
  selector: 'satisfactory-card',
  templateUrl: './satisfactory-card.component.html',
  styleUrl: './satisfactory-card.component.scss'
})
export class SatisfactoryCardComponent implements OnInit {
    @Input() data!: RecipeNode;

    ngOnInit(): void {
        // console.log('Card initialized:', this.data);
        // Here you can emit an event or call a service to notify the parent component if needed
    }
}
