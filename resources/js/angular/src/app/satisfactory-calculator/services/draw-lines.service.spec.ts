import { TestBed } from '@angular/core/testing';

import { DrawLinesService } from './draw-lines.service';

describe('DrawLinesSperviceTsService', () => {
  let service: DrawLinesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DrawLinesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
