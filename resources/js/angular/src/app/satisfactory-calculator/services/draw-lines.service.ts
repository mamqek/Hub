import { Injectable } from '@angular/core';
import { RecipeNode } from './recipe.service';

interface ParentOrChild {
    parentId?: number;
    id: number;
    children?: number[];
};
@Injectable({
  providedIn: null
})
export class DrawLinesService {

    constructor() { }
            

    private transitionStartTimeout: any = null;
    private lines: any[] = [];
    private elementIdLineMap: any = {};
    private hidden = true;

    drawLines (elementArr: ParentOrChild[]) {
            
        elementArr.forEach(element => {

            if (element.parentId === undefined) return;

            const childrenEl = document.getElementById(`card-${element.id}`);
            const parentEl = document.getElementById(`card-${element.parentId}`);

            let line = new LeaderLine(childrenEl, parentEl , {
                startPLug: 'square', 
                endPlug: 'arrow3',
                color: 'gray',
                size: 3,
                path: 'straight',
                hide: true,
                // dash: {animation: true}
            })
                
            // store lines by element index and then call remove line when grag by index and children with parent
            console.log(childrenEl);

            // TODO: have an array is value
            this.elementIdLineMap[element.id] = line;
            this.lines.push(line);

        });
        console.log(this.lines);
        
        // allow pictures in cards to load
        this.redrawLines();

    }
        
    redrawLines() {
        // Use requestAnimationFrame for smoother line positioning
        if (this.lines.length === 0) return;
        requestAnimationFrame(() => {
            this.lines.forEach(line => {
                line.position(); // Reposition the line smoothly
            });
            this.showLines();
        });
    }

    showLines() {
        if (!this.hidden) return;
        this.lines.forEach(line => line.show("draw"));  // or 'fade' or 'none'
        this.hidden = false;
    }

    hideLines() {
        if (this.hidden) return;
        this.lines.forEach(line => line.hide("none"));
        this.hidden = true;
    }
}
