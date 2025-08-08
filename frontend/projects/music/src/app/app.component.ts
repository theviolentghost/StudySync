import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';

import { MediaPlayerComponent } from '../media.player/media.player.component';
import { AuthService } from '../../../../src/app/auth.service';
import { MusicMediaService, DownloadQuality } from '../../music.media.service';
import { MusicPlayerService } from '../../music.player.service';
import { VersionService } from '../../version.service';

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

    constructor(
        private router: Router,
        private player: MusicPlayerService,
        private version_service: VersionService,
    ) {
        this.player.open_player.subscribe(() => {
            this.is_music_idle = false;
        });
    }

    active_link: string = 'playlists';
    is_music_idle: boolean = true; // This can be set based on your app logic

    get app_version(): string {
        return this.version_service.version || '0.0.0';
    }
    public cache_name: string = '';

    on_navigation_link_click(link: { url: string, label: string, icon: string }) {
        this.active_link = link.url;
        this.router.navigate([link.url]);
        // this.elementRef.nativeElement.querySelector('.navigation').scrollTo({ top: 0, behavior: 'smooth' });
    }
}
