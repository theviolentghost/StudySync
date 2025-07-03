import { Component, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';

import { MediaPlayerComponent } from '../media.player/media.player.component';
import { AuthService } from '../../../../src/app/auth.service';
import { MusicMediaService, DownloadQuality } from '../../music.media.service';
import { MusicPlayerService } from '../../music.player.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        CommonModule,
        RouterOutlet,
        MediaPlayerComponent,
        RouterModule,
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
    navigation_links = [
        {
            url: 'artists',
            label: 'Artists',
            icon: 'users.svg'
        },
        {
            url: 'playlists',
            label: 'Playlists',
            icon: 'music.svg'
        },
        {
            url: 'searches',
            label: 'Search',
            icon: 'search.svg'
        },
        {
            url: 'discover',
            label: 'Discover',
            icon: 'world-search.svg'
        },
        {
            url: 'settings',
            label: 'More',
            icon: 'dots.svg'
        },
    ];

    active_link: string = '';

    constructor(
        private elementRef: ElementRef, 
        private media: MusicMediaService,
        private player: MusicPlayerService
    ) {}

    on_navigation_link_click(link: { url: string, label: string, icon: string }) {
        this.active_link = link.url;
        // this.elementRef.nativeElement.querySelector('.navigation').scrollTo({ top: 0, behavior: 'smooth' });
    }
}
