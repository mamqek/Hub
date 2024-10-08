import { Component, ChangeDetectionStrategy, Inject } from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {FormsModule} from '@angular/forms';
import { InputNumberComponent } from 'app/input-number/input-number.component';


@Component({
    selector: 'input-dialog',
    standalone: true,
    imports: [
        MatDialogModule, 
        MatButtonModule, 
        MatInputModule, 
        MatFormFieldModule, 
        InputNumberComponent,
        FormsModule
    ],
    templateUrl: './input-dialog.component.html',
    styleUrl: './input-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputDialogComponent {
    item: string = '';
    amount: number = 0;

    constructor(private dialogRef: MatDialogRef<InputDialogComponent>) {}

    submit() {
        // Close the dialog and pass the data back        
        this.dialogRef.close({
            item: this.item, 
            amount: this.amount 
        });
    }
}
