import { Injectable, ElementRef } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

interface Dimensions {
    width: number;
    height: number;
}
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
    private animationFrameId: number | null = null;
    
    constructor() { }

    // private viewport!: CdkVirtualScrollViewport;
    // private viewportHeight: number = 0;
    // private contentDimensions!: Dimensions;

    // setViewport(viewport: any) {
    //     this.viewport = viewport;
    //     this.viewportHeight = this.viewport.getViewportSize();
    // }

    // setContentDimensions(content: Dimensions) {
    //     this.contentDimensions = content;        
    // }

    newScrollLeft: number = 0;
    newScrollTop: number = 0;

    onMouseDown(event: MouseEvent) {        
      if (event.button === 0) {
            event.preventDefault()
            this.isScrolling = true;

            this.startX = event.clientX;
            this.startY = event.clientY;

            // For virtual scroll
            // to set it from the previous scroll
            // if (this.newScrollLeft !== 0 && this.newScrollTop !== 0) {
            //     this.scrollLeft = Math.max(this.newScrollLeft % this.contentDimensions.width, 0);
            //     this.scrollTop = Math.max(this.newScrollTop % this.contentDimensions.height, 0);
            // } else { // to set it onload afer moved to center
            //     this.scrollLeft = this.viewport.measureScrollOffset('start');
            //     this.scrollTop = this.viewport.measureScrollOffset('end');
            // }

            this.scrollLeft = window.scrollX;
            this.scrollTop = window.scrollY;   
            
            // Throttle mousemove event to limit frequency of position updates
            this.mouseMoveSubscription = fromEvent<MouseEvent>(document, 'mousemove')
            .subscribe(moveEvent => this.scheduleScroll(moveEvent));

            this.mouseUpSubscription = fromEvent(document, 'mouseup').subscribe(() => this.onMouseUp());
        }
    }



    scheduleScroll(event: MouseEvent) {
        // console.log("startX", this.startX);
        // console.log("startY", this.startY);
        
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

        //For virtual scroll
        // this.animationFrameId = requestAnimationFrame(() => {
            
        //     const x = event.clientX - this.startX;
        //     const y = event.clientY - this.startY;

        //     // console.log("scrollLeft", this.scrollLeft);
        //     // console.log("scrollTop", this.scrollTop);
        //     // console.log("x", x);
        //     // console.log("y", y);

            
    
        //     // Adjust the viewport scroll based on mouse movement
        //     const dampingFactor = 0.9999; // Adjust as needed
        //     this.newScrollLeft = this.scrollLeft - x * dampingFactor;
        //     this.newScrollTop = this.scrollTop - y * dampingFactor;

        //     // console.log("newScrollLeft", this.newScrollLeft);
        //     // console.log("newScrollTop", this.newScrollTop);
            
    
        //     // Set the scroll position of the viewport
        //     this.viewport.scrollTo({ top: this.newScrollTop, left: this.newScrollLeft, behavior: 'smooth' });
    
        //     // Update scrollLeft and scrollTop for the next iteration
        //     // this.startX = event.clientX;
        //     // this.startY = event.clientY;
        //     // console.log("startX after", event.clientX);
        //     // console.log("startY after", event.clientY);
        // });
    }
  
    onMouseUp() {
        console.log("mouse up");
        
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
