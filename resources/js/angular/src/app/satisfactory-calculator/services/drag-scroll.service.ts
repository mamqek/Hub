import { Injectable } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';

@Injectable({
  providedIn: null
})
export class DragScrollService {

    private isScrolling = false;
    private scrollLeft = 0;
    private scrollTop = 0;
    private startX = 0;
    private startY = 0;
    mouseMoveSubscription: Subscription | null = null;
    mouseUpSubscription: Subscription | null = null;
  
    constructor() { }
  
    onMouseDown(event: MouseEvent) {        
      if (event.button === 0) { // Right-click
            event.preventDefault()
            this.isScrolling = true;

            this.startX = event.clientX;
            this.startY = event.clientY;

            this.scrollLeft = window.scrollX;
            this.scrollTop = window.scrollY;
      
            
            // Throttle mousemove event to limit frequency of position updates
            this.mouseMoveSubscription = fromEvent<MouseEvent>(document, 'mousemove')
            .subscribe(moveEvent => this.scheduleScroll(moveEvent));

            this.mouseUpSubscription = fromEvent(document, 'mouseup').subscribe(() => this.onMouseUp());
        }
    }

    scheduleScroll(event: MouseEvent) {
        if (!this.isScrolling) return;
        
        // Cancel any pending animation frame request
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    
        // Schedule the next scroll update
        this.animationFrameId = requestAnimationFrame(() => {
            const x = event.clientX - this.startX;
            const y = event.clientY - this.startY;
        
            window.scrollTo({
                left: this.scrollLeft - x,
                top: this.scrollTop - y,
                behavior: 'smooth'
              });
        });

    }
  
    onMouseUp() {
        this.isScrolling = false;
    
        // Unsubscribe from mousemove and mouseup events
        if (this.mouseMoveSubscription) {
          this.mouseMoveSubscription.unsubscribe();
          this.mouseMoveSubscription = null;
        }
    
        if (this.mouseUpSubscription) {
          this.mouseUpSubscription.unsubscribe();
          this.mouseUpSubscription = null;
        }
    }

    disableContextMenu(event: MouseEvent) {
        event.preventDefault();
        console.log("right click");
    
    }
}
