import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';
import { environment } from '../../environments/environment';

@Directive({
  selector: '[basePath]',
})
export class BasePathDirective {

    @Input() path!: string;

    private basePath: string = environment.apiBaseUrl;

    constructor(private el: ElementRef, private renderer: Renderer2) {}
  
    ngOnInit() {
      const fullPath = `${this.basePath}/${this.path}`;
      this.renderer.setAttribute(this.el.nativeElement, 'src', fullPath);
    }

}
