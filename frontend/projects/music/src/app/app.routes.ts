import { Routes } from '@angular/router';

import { SearchComponent } from '../search/search.component';
import { PlaylistsComponent } from '../playlists/playlists.component';
import { ArtistsComponent } from '../artists/artists.component';
import { SettingsComponent } from '../settings/settings.component';


export const routes: Routes = [
    {
        path: '',
        redirectTo: 'playlists',
    },
    {
        path: 'search',
        component: SearchComponent,
    },
    {
        path: 'playlists',
        component: PlaylistsComponent,
    },
    {
        path: 'artists',
        component: ArtistsComponent,
    },
    {
        path: 'settings',
        component: SettingsComponent,
    }
];
