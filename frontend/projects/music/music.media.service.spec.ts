import { TestBed } from '@angular/core/testing';

import { MusicMediaService } from './music.media.service';

describe('MusicMediaService', () => {
  let service: MusicMediaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MusicMediaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
