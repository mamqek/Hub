import { Directive, ElementRef, Input, isDevMode, Renderer2 } from '@angular/core';

@Directive({
  selector: '[basePath]',
})
export class BasePathDirective {

    @Input() path!: string;  // Only the image name is passed

    private basePath: string;

    constructor(private el: ElementRef, private renderer: Renderer2) {
      // Set the base path based on the environment
      this.basePath = isDevMode() ? 'http://localhost:8000/' : 'https://production-cdn.com/images/';
    }
  
    ngOnInit() {
      // Construct the full image path
      const fullPath = `${this.basePath}${this.path}`;
  
      // Set the src attribute on the img element
      this.renderer.setAttribute(this.el.nativeElement, 'src', fullPath);
    }

}
