import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface RecipeSelectDialogData {
    item: string;
    options: string[];
    selected?: string;
}

@Component({
    selector: 'recipe-select-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatSelectModule,
    ],
    templateUrl: './recipe-select-dialog.component.html',
    styleUrl: './recipe-select-dialog.component.scss',
})
export class RecipeSelectDialogComponent {
    selectedRecipe = '';

    constructor(
        private dialogRef: MatDialogRef<RecipeSelectDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: RecipeSelectDialogData
    ) {
        this.selectedRecipe = data.selected || '';
    }

    save() {
        this.dialogRef.close(this.selectedRecipe || null);
    }
}
