import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { jsPlumb, DragOptions } from 'jsplumb';

@Component({
  selector: 'surface',
  templateUrl: './surface.component.html',
  styleUrls: ['./surface.component.scss']
})
export class SurfaceComponent implements AfterViewInit {
  @ViewChild('jsplumbCanvas', { static: false }) canvas!: ElementRef;
  instance: any;

  // Define node types for the palette
  nodeTypes = [
    { type: 'node-type-1', label: 'Node Type 1', w: 100, h: 100 },
    { type: 'node-type-2', label: 'Node Type 2', w: 150, h: 150 }
  ];

  constructor() {}

  ngAfterViewInit(): void {
    // Initialize jsPlumb
    this.instance = jsPlumb.getInstance({
      Container: 'jsplumb-canvas',  // ID of the container
      Connector: ['Flowchart', { cornerRadius: 5 }],
      Endpoint: ['Dot', { radius: 5 }],
      PaintStyle: { stroke: '#456', strokeWidth: 2 },
      Anchors: ['Continuous', 'Continuous']
    });

    this.initializeSurface();
  }

  initializeSurface(): void {
    // Logic for initializing the jsPlumb surface
  }

  // Function to generate data when an element is dragged from the palette
  dataGenerator(el: Element): any {
    return {
      type: el.getAttribute('data-node-type'),
      width: parseInt(el.getAttribute('jtk-width') || '100', 10),
      height: parseInt(el.getAttribute('jtk-height') || '100', 10)
    };
  }

//   surface.setLayout({
//     type:"Circular"
// });
}
