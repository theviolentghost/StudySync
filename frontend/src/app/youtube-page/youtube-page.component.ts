import { Component} from '@angular/core';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { YoutubeService } from './youtube.service';
import { YouTubeSearchResponse } from './video-search-result.model';

@Component({
  selector: 'app-youtube-page', 
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule, RouterOutlet],
  templateUrl: './youtube-page.component.html',
  styleUrl: './youtube-page.component.css'
})
export class YoutubePageComponent {
  SEARCH_DELAY_MS = 500;

  oldSearch = '';
  seachInput = '';
  search;

  constructor(private router: Router,
    private youtubeService: YoutubeService
  ) {
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['select'] 
        } 
    }],{ skipLocationChange: true });
  }

  public navigateToHome(): void {
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['select'] 
        } 
    }], { skipLocationChange: true });
  }

  public navigateToSubscriptionPage(): void {
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['subscription-page'] 
        } 
    }], { skipLocationChange: true });
  }

  public navigateToSearchResults(): void {
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['search-results'] 
        } 
    }], { skipLocationChange: true });
  }

  public navigateToLibraryPage(): void{
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['library-page'] 
        } 
    }], { skipLocationChange: true });
  }

  public updateSearchInput(): void{

    clearTimeout(this.search);

    this.search = setTimeout(() => {
      console.log("auto complete not done");
    }, this.SEARCH_DELAY_MS);
  }  

  public submitSearch():void{
    if(!this.seachInput) return;
    this.youtubeService.currentSearchQuery = this.seachInput;
    
    if(this.seachInput == this.oldSearch){
      this.navigateToSearchResults();
      return;
    }

    this.oldSearch = this.seachInput;

    this.youtubeService.searchVideos(this.seachInput, 15, null)
    .pipe(take(1))
    .subscribe(data => {
      this.youtubeService.saveNextSearchToken(data.nextPageToken);
      this.youtubeService.replaceSearchList(data.results);
    });

    this.navigateToSearchResults();
  }
}
