import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { YoutubeService } from '../youtube.service';
import { SearchResultItem } from '../video-search-result.model';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';


@Component({
  selector: 'app-video-search-results',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './video-search-results.component.html',
  styleUrl: './video-search-results.component.css'
})

export class VideoSearchResultsComponent {
  results:SearchResultItem[] = [];
  resultsSub;
  isSubscribed = false;

  constructor(private router: Router,
    private youtubeService: YoutubeService
  ){}

  ngOnInit() {
    this.resultsSub = this.youtubeService.results$.subscribe(searchResults => {
      this.results = searchResults || [];
    });
  }

  ngOnDestroy() {
    this.resultsSub.unsubscribe();
  }

  public toggleIsSubscribed(): void{
    this.isSubscribed = !this.isSubscribed;
  }

  public navigateToPlayer(url: string): void {
    this.youtubeService.playNewVideo(url);
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['player'] 
        } 
    }], { skipLocationChange: true });
  }

  public navigateToChannel(channelId: string): void {
    this.youtubeService.getFullChannel(channelId)
        .pipe(take(1))
        .subscribe(data => {
          this.youtubeService.saveCurrentChannel(data);
        });
    this.router.navigate(['/youtubeHome', { 
        outlets: { 
            youtube: ['channel-view'] 
        } 
    }], { skipLocationChange: true });
  }

  public timeAgo(isoDate) {
  const now = new Date();
  const past = new Date(isoDate);
  const diffMs = now.getTime() - past.getTime();

  if (diffMs < 0) return "in the future";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return years === 1 ? "1 year ago" : `${years} years ago`;
  if (months > 0) return months === 1 ? "1 month ago" : `${months} months ago`;
  if (days > 0) return days === 1 ? "1 day ago" : `${days} days ago`;
  if (hours > 0) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (minutes > 0) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  if (seconds > 0) return seconds === 1 ? "1 second ago" : `${seconds} seconds ago`;

  return "just now";
}
}
