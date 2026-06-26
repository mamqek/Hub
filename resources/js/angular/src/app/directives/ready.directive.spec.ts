import { ElementRef } from '@angular/core';

import { ReadyDirective } from './ready.directive';

describe('ReadyDirective', () => {
  it('should create an instance', () => {
    const directive = new ReadyDirective(new ElementRef(document.createElement('div')));

    expect(directive).toBeTruthy();
  });
});
