import { Component, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';

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

    public app_version: string = localStorage.getItem('app-version') || '0.0.0';
    public cache_name: string = '';

    constructor(
        private router: Router,
    ) {}

    on_navigation_link_click(link: { url: string, label: string, icon: string }) {
        this.active_link = link.url;
        this.router.navigate([link.url]);
        // this.elementRef.nativeElement.querySelector('.navigation').scrollTo({ top: 0, behavior: 'smooth' });
    }
}
