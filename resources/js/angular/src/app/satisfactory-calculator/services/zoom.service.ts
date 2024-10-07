import { Injectable } from '@angular/core';

@Injectable({
  providedIn: null,
})
export class ZoomService {

    scale = 1; // Default scale
    scaleStep = 0.1; // Step for zooming in and out

    // Limit zooming between 0.5x and 3x
    minScale = 0.5;
    maxScale = 2;
    
    constructor() { }


    handleZoom = this.debounce((event: WheelEvent | KeyboardEvent, element: HTMLElement, callback: (value: number | null) => void) => {
        
        this.scale = this.getCurrentScale(element);        
        let perm_scale = this.scale;
        
        if (event instanceof WheelEvent) {
            // Handle wheel zooming
            if (event.deltaY < 0) { // Scroll up -> Zoom in
                this.zoomIn();
            } else { // Scroll down -> Zoom out
                this.zoomOut();
            }
        } else if (event instanceof KeyboardEvent) {
            // Handle keyboard zooming
            if (event.key === '+' || event.key === '=') {
                this.zoomIn();
            } else if (event.key === '-') {
                this.zoomOut();
            } else if ((event.ctrlKey || event.metaKey) && event.key === '0') {
                this.resetZoom();
            }
        }
        
        if(perm_scale != this.scale) {
            element.style.transform = `scale(${this.scale})`;
            console.log(this.scale);
            callback(this.scale);
            // this.afterZoom();
        }
        else {
            callback(null);
        }

    }, 0); // Adjust the delay as needed

    zoomIn() {    
        this.scale = Number(Math.min(this.maxScale, this.scale + this.scaleStep).toFixed(2));
    }

    zoomOut() {    
        this.scale = Number(Math.max(this.minScale, this.scale - this.scaleStep).toFixed(2));
    }

    resetZoom() {
        this.scale = 1; // Reset scale to default
    }



    // Helper method to get the current scale from the element's transform style
    getCurrentScale(element: HTMLElement): number {
        const transform = getComputedStyle(element).transform;
        if (transform === 'none') return 1; // default scale if no transform is applied
        
        // Extract the matrix values from the transform (assuming 2D scale)
        const matrix = transform.match(/matrix\((.+)\)/);        
        return matrix ? parseFloat(matrix[1].split(', ')[0]) : 1;
    }


    debounce(func: (...args: any[]) => void, delay: number): (...args: any[]) => void {
        let timeout: any; // Use 'any' instead of 'NodeJS.Timeout'
        return (...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }



    // FOR VIRTUAL SCROLL

    // @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;


    // afterZoom() {
    //     let previousSize = this.currentCellSize;
    //     this.currentCellSize = this.cellSize * this.scale;
    //     this.viewport.checkViewportSize();
    //     this.recenterScroll(previousSize);
    // }

    // // when zooming out board size decreases by 10%, extra space appears on each side of content wrapper (5%), this affects corectness of virtual scroller rendering, so it behavves incorrectly. board postion and wrapper ize need to be adjusted on zoom
    // recenterScroll(previousItemSize: number) {
    //     const currentScrollOffset = this.viewport.measureScrollOffset('top');
    //     console.log(this.currentCellSize);
        
    //     const visibleItemsCount = this.viewport.getViewportSize() / this.currentCellSize;
    //     console.log("viewportSize", this.viewport.getViewportSize());
        
    //     console.log("currentScrollOffset", currentScrollOffset);
        
    //     console.log("visibleItemsCount", visibleItemsCount);
        

    //     // Calculate the new scroll position to center the content
    //     const newScrollOffset = (currentScrollOffset / this.currentCellSize) * this.currentCellSize;
    //     const totalItems = this.viewport.getDataLength();
    //     console.log("totalItems", totalItems);
        
    //     const start = this.viewport.getRenderedRange().start;
    //     const end = this.viewport.getRenderedRange().end;
    //     console.log(`Rendered range: ${start} - ${end}`);

    //     const middleItemIndex = start + (end - start) / 2;
    //     // const middleItemIndex = totalItems / 2;
    //     console.log("middleItemIndex", middleItemIndex);
        
    //     // const scrollToPosition = middleItemIndex * this.currentCellSize - (visibleItemsCount * this.currentCellSize) / 2;
    //     const viewportHeight = this.viewport.getViewportSize();
    //     const middleItemOffset = middleItemIndex * this.itemSize;
    //     const scrollToPosition = middleItemOffset - (viewportHeight / 2 - this.itemSize / 2);

    //     // const scrollToPosition = (currentScrollOffset / previousItemSize) * this.currentCellSize;
    //     console.log("scrollToPosition", scrollToPosition);
    //     // this.viewport.scrollToIndex(middleItemIndex, 'smooth'); // Scroll to the new centered position
    //     this.viewport.scrollToOffset(scrollToPosition); // Scroll to the new centered position
    //     this.viewport.checkViewportSize(); // Recalculate the layout after scroll
    // }

    // private logRenderedRange() {
    //     const height = this.boardDiv.nativeElement.getBoundingClientRect();
    //     console.log("height", height);
    //     // Get the rendered range of items
    //     const renderedRange = this.viewport.getRenderedRange();
    //     console.log('Rendered range:', renderedRange.start, '-', renderedRange.end);
    // }
    
}
