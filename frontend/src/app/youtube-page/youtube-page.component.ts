import { Component} from '@angular/core';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-youtube-page', 
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule, RouterOutlet],
  templateUrl: './youtube-page.component.html',
  styleUrl: './youtube-page.component.css'
})
export class YoutubePageComponent {
  SEARCH_DELAY_MS = 500;

  seachInput = '';
  search;

  constructor(private router: Router) {
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

  public updateSearchInput(): void{

    clearTimeout(this.search);

    this.search = setTimeout(() => {
      console.log("auto complete not done");
    }, this.SEARCH_DELAY_MS);
  }  

  public submitSearch():void{
    if(!this.seachInput) return;

    this.navigateToSearchResults();
  }
}
