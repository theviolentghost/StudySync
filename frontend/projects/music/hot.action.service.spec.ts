import { TestBed } from '@angular/core/testing';

import { HotActionService } from './hot.action.service';

describe('HotActionService', () => {
  let service: HotActionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HotActionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
