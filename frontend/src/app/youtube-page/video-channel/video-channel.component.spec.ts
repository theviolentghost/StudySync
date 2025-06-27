import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoChannelComponent } from './video-channel.component';

describe('VideoChannelComponent', () => {
  let component: VideoChannelComponent;
  let fixture: ComponentFixture<VideoChannelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoChannelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoChannelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
