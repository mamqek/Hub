import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface RecipeSelectDialogData {
    item: string;
    options: string[];
    selected?: string;
    showApplyScope?: boolean;
}

export interface RecipeSelectDialogResult {
    selectedRecipe: string | null;
    applyToAll: boolean;
}

@Component({
    selector: 'recipe-select-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatSelectModule,
    ],
    templateUrl: './recipe-select-dialog.component.html',
    styleUrl: './recipe-select-dialog.component.scss',
})
export class RecipeSelectDialogComponent {
    selectedRecipe = '';
    applyToAll = true;

    constructor(
        private dialogRef: MatDialogRef<RecipeSelectDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: RecipeSelectDialogData
    ) {
        this.selectedRecipe = data.selected || '';
        this.applyToAll = true;
    }

    save() {
        this.dialogRef.close({
            selectedRecipe: this.selectedRecipe || null,
            applyToAll: this.applyToAll,
        } as RecipeSelectDialogResult);
    }
}
