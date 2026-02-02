import { Injectable  } from '@angular/core';
import { RecipeNode } from './recipe.service';

interface ParentOrChild {
    parentId?: number;
    id: number;
    children?: number[];
    flowText?: string;
};
@Injectable({
  providedIn: null
})
export class DrawLinesService {

    constructor() { }
            

    private transitionStartTimeout: any = null;
    private lines: any[] = [];
    private elementIdLineMap: any = {};
    private elementIdFlowTextMap: Record<number, string> = {};
    private elementIdFlowLabelMap: Record<number, any> = {};
    private hidden = true;
    private directionAnimationEnabled = false;

    drawLines (elementArr: ParentOrChild[]) {
        
        let processedIds: number[] = [];
        
        elementArr.forEach(element => {

            if (element.parentId === undefined) return;

            const childrenEl = document.getElementById(`card-${element.id}`);
            const parentEl = document.getElementById(`card-${element.parentId}`);

            let line = new LeaderLine(childrenEl, parentEl , {
                startPLug: 'square', 
                endPlug: 'arrow3',
                color: '#f2f200', //3F0D12
                size: 3,
                path: 'straight',
                hide: true,
                endPlugSize: 1.5,
                dash: {animation: false},
                zIndex: 1
            })

            // Ensure lines stay below overlays/dialogs.
            if (line && typeof (line as any).setOptions === 'function') {
                (line as any).setOptions({ zIndex: 1 });
            }
            if (line && (line as any).svg && (line as any).svg.style) {
                (line as any).svg.style.zIndex = '1';
                (line as any).svg.style.pointerEvents = 'none';
            }
                

            // TODO: have an array is value
            this.elementIdLineMap[element.id] = line;
            this.elementIdFlowTextMap[element.id] = element.flowText || '';
            processedIds.push(element.id);
        });

        this.lines = Object.values(this.elementIdLineMap);
        
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

    startDirectionAnimation() {
        if (this.directionAnimationEnabled || this.lines.length === 0) return;
        this.directionAnimationEnabled = true;
        Object.entries(this.elementIdLineMap).forEach(([id, lineAny]) => {
            const line: any = lineAny as any;
            const flowId = Number(id);
            const flowText = this.elementIdFlowTextMap[flowId];
            if (line && typeof line.setOptions === 'function') {
                if (flowText && !this.elementIdFlowLabelMap[flowId]) {
                    this.elementIdFlowLabelMap[flowId] = LeaderLine.captionLabel(flowText, {
                        color: '#f2f200',
                        outlineColor: 'rgba(0,0,0,0)',
                    });
                }
                line.setOptions({
                    dash: { animation: true },
                    middleLabel: this.elementIdFlowLabelMap[flowId] || '',
                });
            }
            line.show('none');
        });
    }

    stopDirectionAnimation() {
        if (!this.directionAnimationEnabled) return;
        this.directionAnimationEnabled = false;
        Object.entries(this.elementIdLineMap).forEach(([id, lineAny]) => {
            const line: any = lineAny as any;
            if (line && typeof line.setOptions === 'function') {
                line.setOptions({ dash: { animation: false }, middleLabel: '' });
            }
            line.show('none');
        });
        this.elementIdFlowLabelMap = {};
    }

    hideAllLines() {
        if (this.hidden) return;
        this.lines.forEach(line => line.hide("none"));
        this.hidden = true;
    }

    removeAllLines() {
        this.lines.forEach(line => line.remove());
    }

    hideLinesByElementId(elementIdArr: number[]) {
        elementIdArr.forEach(id => {
            //TODO: slow down this animation
            this.elementIdLineMap[id].hide("draw");
        });
    }

    removeLinesByElementId(elementIdArr: number[]) {
        elementIdArr.forEach(id => {
            this.elementIdLineMap[id].remove();
            delete this.elementIdLineMap[id];
            delete this.elementIdFlowTextMap[id];
            delete this.elementIdFlowLabelMap[id];
        });
        this.lines = Object.values(this.elementIdLineMap);  
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

    resetLines() {
        this.removeAllLines();
        this.elementIdLineMap = {};
        this.elementIdFlowTextMap = {};
        this.elementIdFlowLabelMap = {};
    }
}
