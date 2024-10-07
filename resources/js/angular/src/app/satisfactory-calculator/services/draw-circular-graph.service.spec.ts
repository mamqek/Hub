import { TestBed } from '@angular/core/testing';

import { DrawCircularGraphService } from './draw-circular-graph.service';

describe('DrawCircularGraphService', () => {
  let service: DrawCircularGraphService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DrawCircularGraphService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
