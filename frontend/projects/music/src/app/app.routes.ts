import { Routes } from '@angular/router';

import { SearchComponent } from '../search/search.component';
import { PlaylistsComponent } from '../playlists/playlists.component';
import { ArtistsComponent } from '../artists/artists.component';
import { SettingsComponent } from '../settings/settings.component';
import { DiscoverComponent } from '../discover/discover.component';
import { PlaylistComponent } from '../playlist/playlist.component';


export const routes: Routes = [
    {
        path: '',
        redirectTo: 'playlists',
        pathMatch: 'full',
    },
    // { path: '**', redirectTo: 'playlists' },
    {
        path: 'searches',
        component: SearchComponent,
    },
    {
        path: 'playlists',
        component: PlaylistsComponent,
    },
    {
        path: 'playlist/:playlist_id',
        component: PlaylistComponent,
    },
    {
        path: 'artists',
        component: ArtistsComponent,
    },
    {
        path: 'discover',
        component: DiscoverComponent,
    },
    {
        path: 'settings',
        component: SettingsComponent,
    }
];
