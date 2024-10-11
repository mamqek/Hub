import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'capitalizedSnake'
})
export class CapitalizedSnakePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return value;

    return value
      .split(' ') // Split the string by spaces
      .map((word, index) => {
        // Capitalize the first character of the word before the underscore
        return (index > 0 ? '_' : '' ) + word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(''); // Join the transformed words back together
  }
}
