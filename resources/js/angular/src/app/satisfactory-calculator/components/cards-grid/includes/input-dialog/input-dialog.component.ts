import { Component, ChangeDetectionStrategy, Inject } from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';

@Component({
  selector: 'input-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './input-dialog.component.html',
  styleUrl: './input-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputDialogComponent {

}
