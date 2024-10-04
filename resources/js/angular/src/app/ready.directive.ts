import { Directive, ElementRef, AfterViewInit } from '@angular/core';

@Directive({
  selector: '[appReady]'  // You can use this selector in your HTML
})
export class ReadyDirective implements AfterViewInit {
  
  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    // Set an attribute or class when the element is ready
    this.el.nativeElement.setAttribute('data-ready', 'true');
  }
}
