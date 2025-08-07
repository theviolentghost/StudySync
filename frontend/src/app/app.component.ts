import { Component } from '@angular/core';
import { CursorComponent } from './cursor/cursor.component';
import { VideoPlayerComponent } from './video-player/video-player.component';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [
    VideoPlayerComponent,
    CursorComponent,
    RouterModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  
}
