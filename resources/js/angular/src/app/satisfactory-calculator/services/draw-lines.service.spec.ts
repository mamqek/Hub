import { TestBed } from '@angular/core/testing';

import { DrawLinesSperviceTsService } from './draw-lines.service';

describe('DrawLinesSperviceTsService', () => {
  let service: DrawLinesSperviceTsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DrawLinesSperviceTsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
