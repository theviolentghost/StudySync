import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { NoteEditorComponent } from './user.space/note.editor/note.editor.component';
import { CursorComponent } from './cursor/cursor.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { YoutubeService } from './youtube-page/youtube.service';
import { min, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    NoteEditorComponent,
    CursorComponent,
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  videoId: string = '';
  videoUrl: SafeResourceUrl;
  urlSub;

  widthSub;
  playerWidth = 0;
 
  minSub
  isMinimized = true;

  ySub
  playerY = 0;

  constructor(private sanitizer: DomSanitizer,
    private youtubeService: YoutubeService
  ) {}

  ngOnInit() {
    this.widthSub = this.youtubeService.videoWidth$.subscribe(width => {
      this.playerWidth = width;
    });

    this.ySub = this.youtubeService.videoY$.subscribe(y => {
      this.playerY = 96 - y;
    });

    this.minSub = this.youtubeService.videoMinimized$.subscribe(minimized => {
      this.isMinimized = minimized;
    });

    this.urlSub = this.youtubeService.videoUrl$.subscribe(newUrl => {
      this.videoUrl = this.getEmbedUrl(newUrl);
    });
  }

  ngOnDestroy() {
    this.urlSub.unsubscribe();
    this.minSub.unsubscribe();
    this.widthSub.unsubscribe();
    this.ySub.unsubscribe();
  }

  getPlayerWidth(){
    if(this.isMinimized) return null;
    return this.playerWidth;
  }

  getPlayerY(){
    if(this.isMinimized) return null;
    return this.playerY;
  }

  getEmbedUrl(id: string): SafeResourceUrl {
    if (!id) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/');
    }
    if(this.videoId == id) return;
    this.videoId = id;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${id}?enablejsapi=1&controls=1`);
  }
}
