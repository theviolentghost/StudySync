import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoSelectComponent } from './video-select.component';

describe('VideoSelectComponent', () => {
  let component: VideoSelectComponent;
  let fixture: ComponentFixture<VideoSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
