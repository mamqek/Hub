import { Directive, ElementRef, Input, isDevMode, Renderer2 } from '@angular/core';

@Directive({
  selector: '[basePath]',
})
export class BasePathDirective {

    @Input() path!: string;

    private basePath: string = window.location.origin;

    // On Dev mode app is on a differernt port from backend, in prod on local or server it is the same as current location.origin
    constructor(private el: ElementRef, private renderer: Renderer2) {
        this.basePath = isDevMode() ? 'http://localhost:8000' : this.basePath;
    }
  
    ngOnInit() {
      const fullPath = `${this.basePath}/${this.path}`;
      this.renderer.setAttribute(this.el.nativeElement, 'src', fullPath);
    }

}
