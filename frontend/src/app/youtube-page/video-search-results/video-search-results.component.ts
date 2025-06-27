import { Component} from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-video-search-results',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './video-search-results.component.html',
  styleUrl: './video-search-results.component.css'
})

export class VideoSearchResultsComponent {
  videos:Number[] = [];
  isSubscribed = false;

  constructor(private router: Router){
    for(let i = 0; i < 25; i++){
      this.videos[i] = i;
    }
  }

  public toggleIsSubscribed(): void{
    this.isSubscribed = !this.isSubscribed;
  }

  public navigateToPlayer(): void {
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['player'] 
        } 
    }], { skipLocationChange: true });
  }

  public navigateToChannel(): void {
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['channel-view'] 
        } 
    }], { skipLocationChange: true });
  }
}
