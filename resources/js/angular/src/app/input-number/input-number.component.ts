import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';

@Component({
  selector: 'input-number',
  standalone: true,
  imports: [CommonModule, MatInputModule, FormsModule, MatFormFieldModule],
  templateUrl: './input-number.component.html',
  styleUrl: './input-number.component.scss'
})
export class InputNumberComponent {

//     <app-custom-number-input
//   [(modelValue)]="amount"
//   [min]="0"
//   [max]="100"
//   id="customInput"
//   label="Quantity"
// ></app-custom-number-input>

    @Input() modelValue: number = 0;
    @Input() max: number = 999;
    @Input() min: number = 0;
    @Input() id: string = '';
    @Input() label: string = '';
    @Input() suffix: any;

    @Output() modelValueChange: EventEmitter<number> = new EventEmitter<number>();

    get overMax(): boolean {
        return this.modelValue >= this.max;
    }

    get belowMin(): boolean {
        return this.modelValue <= this.min;
    }

    increment(): void {
        if (!this.overMax) {
        this.modelValue++;
        this.modelValueChange.emit(this.modelValue);
        }
    }

    decrement(): void {
        if (!this.belowMin) {
        this.modelValue--;
        this.modelValueChange.emit(this.modelValue);
        }
    }

    updateValue(event: any): void {
        const value = Number(event.target.value);
        this.modelValue = value;
        this.modelValueChange.emit(this.modelValue);
    }
}
