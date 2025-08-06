import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoPlayerPageComponent } from './video-player.component';

describe('VideoPlayerComponent', () => {
  let component: VideoPlayerPageComponent;
  let fixture: ComponentFixture<VideoPlayerPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoPlayerPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoPlayerPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
