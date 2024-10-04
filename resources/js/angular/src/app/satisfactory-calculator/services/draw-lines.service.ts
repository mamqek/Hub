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
        
        let processedIds: number[] = [];
        
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
                

            // TODO: have an array is value
            this.elementIdLineMap[element.id] = line;
            this.lines.push(line);

            processedIds.push(element.id);
        });
        console.log(this.lines);
        
        // allow pictures in cards to load
        this.redrawLinesByElementId(processedIds);

    }
        
    redrawAllLines() {
        // Use requestAnimationFrame for smoother line positioning
        if (this.lines.length === 0) return;
        requestAnimationFrame(() => {
            this.lines.forEach(line => {
                line.position(); // Reposition the line smoothly
            });
            this.showAllLines();
        });
    }

    showAllLines() {
        if (!this.hidden) return;
        this.lines.forEach(line => line.show("draw"));  // or 'fade' or 'none'
        this.hidden = false;
    }

    hideAllLines() {
        if (this.hidden) return;
        this.lines.forEach(line => line.hide("none"));
        this.hidden = true;
    }

    hideLinesByElementId(elementIdArr: number[]) {
        elementIdArr.forEach(id => {
            //TODO: slow down this animation
            this.elementIdLineMap[id].hide("draw");
        });
    }


    redrawLinesByElementId(elementIdArr: number[]) {        
        requestAnimationFrame(() => {        
            elementIdArr.forEach(id => {
                let line = this.elementIdLineMap[id];                
                line.position();
                line.show("draw");
            });
        });
    }
}
