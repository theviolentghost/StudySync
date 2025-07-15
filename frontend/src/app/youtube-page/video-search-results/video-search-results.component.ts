import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { YoutubeService } from '../youtube.service';
import { SearchResultItem } from '../video-search-result.model';
import { Subscription } from 'rxjs';
import { FileManagerService } from '../../user.space/note.editor/file.manager.service';
import { YoutubeSubscriptionService } from '../youtube-subscription.service';


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
  private isAddingToSearch: boolean = false;

  constructor(private router: Router,
    private youtubeService: YoutubeService,
    private youtubeSubscriptionService: YoutubeSubscriptionService
  ){}

  ngOnInit() {
    window.scrollTo(0, 0);
    this.resultsSub = this.youtubeService.searchResults$.subscribe(searchResults => {
      this.results = searchResults || [];
      this.isAddingToSearch = false;
    });
  }

  ngOnDestroy() {
    this.resultsSub.unsubscribe();
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event) {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const pageHeight = document.getElementById('results_list').offsetHeight - document.body.offsetHeight;

    if (!this.isAddingToSearch && scrollY >= pageHeight){ 
      this.isAddingToSearch = true;
      this.youtubeService.addToSearchList();
    }
  }

  public toggleIsSubscribed(channelId: string): void{
    this.isSubscribed = !this.isSubscribed;

    if(this.isSubscribed){
      this.youtubeSubscriptionService.subscribeToChannel(channelId);
      return;
    } 

    this.youtubeSubscriptionService.unsubscribeToChannel(channelId);
  }

  public isSubscribedToChannel(channelId: string): boolean{
    return this.youtubeSubscriptionService.isSubscribed(channelId);
  }

  public navigateToPlayer(videoId: string): void {
    this.youtubeService.navigateToPlayer(videoId);
  }

  public navigateToChannel(channelId: string): void {
    this.youtubeService.navigateToChannel(channelId);
  }

  public timeAgo(isoDate) {
   return this.youtubeService.timeAgo(isoDate);
  }
}
