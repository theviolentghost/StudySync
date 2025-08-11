import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { Song_Playlist_Identifier } from './music.media.service';

@Injectable({
  providedIn: 'root'
})
export class QuickActionService {
    quick_action_open: boolean = false;
    playlist_view_color: string = ''; 
    action: string = 'pick_playlist_color';

    constructor(
        private router: Router,
    ) { 
        // Listen for navigation end events
        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd) => {
                this.reset_all_params();
            });
    }

    private reset_all_params(): void {
        this.quick_action_open = false;
        this.playlist_view_color = '';
    }

    public reset(): void {
        this.reset_all_params();
    }
}
