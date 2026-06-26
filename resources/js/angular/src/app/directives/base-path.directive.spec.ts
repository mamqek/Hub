import { ElementRef, Renderer2 } from '@angular/core';

import { BasePathDirective } from './base-path.directive';

describe('BasePathDirective', () => {
  it('should create an instance', () => {
    const renderer = jasmine.createSpyObj<Renderer2>('Renderer2', ['setAttribute']);
    const directive = new BasePathDirective(new ElementRef(document.createElement('img')), renderer);

    expect(directive).toBeTruthy();
  });
});
