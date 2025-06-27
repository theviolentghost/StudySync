import { Component} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-video-channel',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './video-channel.component.html',
  styleUrl: './video-channel.component.css'
})
export class VideoChannelComponent {

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
}
