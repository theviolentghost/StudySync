import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CursorComponent } from './cursor/cursor.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { YoutubeService } from './youtube-page/youtube.service';

import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    CursorComponent,
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  lastClickTime: number = 0;

  player: Plyr;
  controlsVisible: boolean;
  isHidingControls;
  isPaused: boolean;

  videoId: string = '';
  videoUrl: SafeResourceUrl;
  videoIdSub;

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
      if(!width) return;
      this.playerWidth = width;
    });

    this.ySub = this.youtubeService.videoY$.subscribe(y => {
      this.playerY = 96 - y;
    });

    this.minSub = this.youtubeService.videoMinimized$.subscribe(minimized => {
      this.isMinimized = minimized;
    });

    this.videoIdSub = this.youtubeService.videoId$.subscribe(videoId => {
      if(this.videoId == videoId) return;
      this.videoId = videoId;
      this.videoUrl = this.getEmbedUrl(videoId);
      if(!videoId) return;
      if(this.player){
        this.loadVideo(videoId);
        return;
      }
      this.initilizePlyr(this.videoId);
    });
  }

  ngOnDestroy() {
    this.videoIdSub.unsubscribe();
    this.minSub.unsubscribe();
    this.widthSub.unsubscribe();
    this.ySub.unsubscribe();
    if (this.player) {
      this.player.destroy();
    }
  }

  getPlayerWidth(){
    if(this.isMinimized) return null;
    return this.playerWidth;
  }

  getPlayerY(){
    if(this.isMinimized) return null;
    return this.playerY;
  }

  initilizePlyr(videoId: string) {
    this.showControls();
    let player = document.getElementById('plyrPlayer');
    this.player = new Plyr(player, {
      autoplay: false,//TODO only false to test
      controls: [
        'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen', 'pip'
      ]
    });

    this.player.on('controlsshown', () => {
      this.showControls();
    });

    this.player.on('controlshidden', () => {
      this.hideControls();
    });

    this.player.on('play', () => {
      this.isPaused = false;
      this.hideControls();
    });

    this.player.on('pause', () => {
      this.isPaused = true;
      this.showControls();
    });

    this.player.on('timeupdate', () => {
      //console.log('Current time:', this.player.currentTime);
    });

    let clickBlocker = document.getElementById('main_click_blocker');

    clickBlocker.addEventListener('mousemove' , () => {
      this.player.elements.container.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    });

    clickBlocker.addEventListener('click' , () => {
      this.player.elements.container.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    });

    this.loadVideo(videoId);
  }

  showControls(): void{
    this.controlsVisible = true;
  }

  hideControls(): void{
    if(this.isHidingControls) return;

    this.isHidingControls = setTimeout(() => {
      if(this.isPaused) return;
      this.controlsVisible = false;
      this.isHidingControls = false;
    } ,3000);
  }

  loadVideo(videoId: string) {
    this.player.source = {
      type: 'video',
      sources: [{
        src: videoId,
        provider: 'youtube'
      }]
    };
  }

  isDoubleClick(): boolean{
    const now = Date.now();
    if(now - this.lastClickTime > 300){
      this.lastClickTime = now;
      return false;
    }
    this.lastClickTime = now;
    return true;
  }

  jumpForward(amount: number): void{
    if(!this.isDoubleClick()) return;
    this.player.currentTime += amount;
  }

  rewind(amount: number): void{
    if(!this.isDoubleClick()) return;
    this.player.currentTime -= amount;
  }

  togglePlay(): void{
    if(!this.player) return;

    if(this.isPaused){
      this.player.play();
      return;
    }

    this.player.pause();
  }

  minimizePlayer(){
    this.youtubeService.minimizePlayer();
  }

  expandPlayer(){
    this.youtubeService.expandPlayer();
    this.youtubeService.navigateToPlayer();
  }

  xPlayer(){
    this.youtubeService.playNewVideo('');
    this.youtubeService.expandPlayer();
  }

  getEmbedUrl(id: string): SafeResourceUrl {
    if (!id) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/');
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${id}?enablejsapi=1&controls=1`);
  }
}
