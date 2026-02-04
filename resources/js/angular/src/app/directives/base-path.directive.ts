import { Directive, ElementRef, Input, OnChanges, Renderer2, SimpleChanges } from '@angular/core';
import { environment } from '../../environments/environment';

@Directive({
  selector: '[basePath]',
})
export class BasePathDirective implements OnChanges {

    @Input() path!: string;

    private basePath: string = environment.apiBaseUrl;

    constructor(private el: ElementRef, private renderer: Renderer2) {}
  
    ngOnInit() {
      this.updateSource();
    }

    ngOnChanges(changes: SimpleChanges): void {
      if (changes['path']) {
        this.updateSource();
      }
    }

    private updateSource(): void {
      if (!this.path) {
        return;
      }

      if (/^(https?:)?\/\//.test(this.path) || this.path.startsWith('data:')) {
        this.renderer.setAttribute(this.el.nativeElement, 'src', this.path);
        return;
      }

      const normalizedBasePath = this.basePath.replace(/\/+$/, '');
      const normalizedPath = this.path.replace(/^\/+/, '');
      const fullPath = `${normalizedBasePath}/${normalizedPath}`;
      this.renderer.setAttribute(this.el.nativeElement, 'src', fullPath);
    }

}
