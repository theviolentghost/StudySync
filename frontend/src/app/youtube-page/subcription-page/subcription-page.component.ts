import { Component} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { YoutubeService } from '../youtube.service';

@Component({
  selector: 'app-subcription-page',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './subcription-page.component.html',
  styleUrl: './subcription-page.component.css'
})
export class SubcriptionPageComponent {

  videos:Number[] = [];
  subscriptions:Number[] = [];

  constructor(private router: Router,
    private youtubeService: YoutubeService
  ){
    for(let i = 0; i < 30; i++){
      this.videos[i] = i;
      this.subscriptions[i] = i;
    }
  }

  public navigateToPlayer(): void {
    this.youtubeService.navigateToPlayer('');
  }

  public navigateToChannel(): void {
    this.youtubeService.navigateToChannel('');
  }

}
