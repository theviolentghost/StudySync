import { Component, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { MediaPlayerComponent } from '../media.player/media.player.component';
import { AuthService } from '../../../../src/app/auth.service';
import { MusicMediaService, DownloadQuality } from '../../music.media.service';
import { MusicPlayerService } from '../../music.player.service';

@Component({
    selector: 'app-root',
    imports: [
        CommonModule,
        RouterOutlet,
        MediaPlayerComponent,
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
    constructor(
        private elementRef: ElementRef, 
        private media: MusicMediaService,
        private player: MusicPlayerService
    ) {}
}
