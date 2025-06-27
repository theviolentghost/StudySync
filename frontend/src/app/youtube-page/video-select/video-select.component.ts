import { Component} from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-video-select',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './video-select.component.html',
  styleUrl: './video-select.component.css'
})
export class VideoSelectComponent {
  videos:Number[] = [];

  constructor(private router: Router){
    for(let i = 0; i < 25; i++){
      this.videos[i] = i;
    }
  }

  public navigateToPlayer(): void {
    const videoId = 'abcde'
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['player', videoId] 
        } 
    }], { skipLocationChange: false });
  }

  public navigateToChannel(): void {
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['channel-view'] 
        } 
    }], { skipLocationChange: true });
  }
}
