import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { RouterModule, Router } from '@angular/router';
import { YouTubeSearchResponse, SearchResultItem } from './video-search-result.model';
import { YouTubeChannel } from './youtube-channel-search-results.model';
import { max, take } from 'rxjs/operators';
import { Playlist, PlaylistVideo } from './youtube-playlist-results.model';
import { WatchHistoryService } from './watch-history.service';

@Injectable({
  providedIn: 'root'
})
export class YoutubeService {
    private backendURL = "http://localhost:3000";

    private _currentSearchQuery: string;
    private nextSearchPageToken: string;
    private searchList: SearchResultItem[];
    private searchResultsSubject = new BehaviorSubject<SearchResultItem[] | null>(null);
    searchResults$: Observable<SearchResultItem[] | null> = this.searchResultsSubject.asObservable();

    private videoIdSubject = new BehaviorSubject<string | null>(null);
    videoId$: Observable<string | null> = this.videoIdSubject.asObservable();
    private minimizedSubject = new BehaviorSubject<boolean | null>(null);
    videoMinimized$: Observable<boolean | null> = this.minimizedSubject.asObservable();
    private videoWidthSubject = new BehaviorSubject<number | null>(null);
    videoWidth$: Observable<number | null> = this.videoWidthSubject.asObservable();
    private videoYSubject = new BehaviorSubject<number | null>(null);
    videoY$: Observable<number | null> = this.videoYSubject.asObservable();

    private channelSubject = new BehaviorSubject<YouTubeChannel | null>(null);
    channel$: Observable<YouTubeChannel | null> = this.channelSubject.asObservable();
    private uploadsPageToken: string;
    private channelUploadList: PlaylistVideo[];
    private channelUploadsSubject = new BehaviorSubject<PlaylistVideo[] | null>(null);
    channelUploads$: Observable<PlaylistVideo[] | null> = this.channelUploadsSubject.asObservable();

    constructor(private http: HttpClient,
        private router: Router,
        private watchHistoryService: WatchHistoryService
    ) { }

    searchVideos(query: string, maxResults: number = 10, nextPageToken): Observable<any> {
        let params = new HttpParams()
            .set('q', query)
            .set('maxResults', maxResults);

        if (nextPageToken) {
            params = new HttpParams().set('nextPageToken', nextPageToken).set('q', query).set('maxResults', maxResults);
        }
        return this.http.get<YouTubeSearchResponse>(`${this.backendURL}/youtube_search`, { params });
    }

    getFullChannel(id: string): Observable<any>{
        let params = new HttpParams()
            .set('id', id);

        return this.http.get<YouTubeChannel>(`${this.backendURL}/youtube_full_channel`, { params });
    }

    // getChannelPlaylists(id: string): Observable<any>{
    //     let params = new HttpParams()
    //         .set('id', id);

    //     return this.http.get<YouTubeSearchResponse>(`${this.backendURL}/youtube_get_channel_playlists`, { params });
    // }

    getPlaylistVideos(id: string, nextPageToken: string): Observable<any>{
        let params = new HttpParams()
            .set('id', id)
            .set('nextPageToken', nextPageToken);

        return this.http.get<YouTubeSearchResponse>(`${this.backendURL}/youtube_get_playlist_videos`, { params });
    }

    get isDisplayingVideo(): boolean{
        return this.videoIdSubject.value ? true : false;
    }

    get isMinimized(): boolean{
        return this.minimizedSubject.value;
    }

    set currentSearchQuery(search: string){
        this._currentSearchQuery = search;
    }

    set videoPlayerWidth(number: number){
        this.videoWidthSubject.next(number);
    }

    set videoPlayerY(number: number){
        this.videoYSubject.next(number);
    }

    set channel(channel: YouTubeChannel){
        this.channelSubject.next(channel);
    }

    public minimizePlayer(){
        this.minimizedSubject.next(true);
    }

    public expandPlayer(){
        this.minimizedSubject.next(false);
    }

    public playNewVideo(video: PlaylistVideo):void{
        let videoId = video.contentDetails.videoId;

        if(!this.isMinimized) {
            this.navigateToPlayer();
        }else{
            if(this.videoIdSubject.value == videoId) {
                this.navigateToPlayer();
                this.expandPlayer();
                return;
            }
        }
        this.videoIdSubject.next(videoId);
        this.watchHistoryService.saveCurrentVideo(video);
    }

    public removeVideoPlaying(): void{
        this.videoIdSubject.next('');
    }

    saveNextSearchToken(token: string): void{
        this.nextSearchPageToken = token;
    }

    replaceSearchList(list :SearchResultItem[]):void{
        this.searchList = list;
        this.searchResultsSubject.next(this.searchList);
    }

    addToSearchList(): void{
        this.searchVideos(this._currentSearchQuery, 15, this.nextSearchPageToken)
        .pipe(take(1))
        .subscribe(results => {
            this.saveNextSearchToken(results.nextPageToken);
            this.searchList.push(...results.results);
            this.searchResultsSubject.next(this.searchList);
        });
    }

    saveCurrentChannel(channel: YouTubeChannel){
        this.channelSubject.next(channel);
    }

    saveUploadsPageToken(token: string):void{
        this.uploadsPageToken = token;
    }

    replaceChannelUploadList(list :PlaylistVideo[]){
        this.channelUploadList = list;
        this.channelUploadsSubject.next(this.channelUploadList);
    }

    addToUploadList(): void{
        if(!this.uploadsPageToken) return;
        this.getPlaylistVideos(this.channelSubject.value.contentDetails.relatedPlaylists.uploads, this.uploadsPageToken)
            .pipe(take(1))
            .subscribe(uploads => {
                this.saveUploadsPageToken(uploads.nextPageToken);
                this.channelUploadList.push(...uploads.results);
                this.channelUploadsSubject.next(this.channelUploadList);
            });
        
    }

    public navigateToChannel(channelId: string): void {
        if(!channelId) return;

        this.getFullChannel(channelId)
            .pipe(take(1))
            .subscribe(data => {
                this.saveCurrentChannel(data);
        
                let nextPageToken = '';
                this.getPlaylistVideos(data.contentDetails.relatedPlaylists.uploads, nextPageToken)
                .pipe(take(1))
                .subscribe(uploads => {
                    this.saveUploadsPageToken(uploads.nextPageToken);
                    this.replaceChannelUploadList(uploads.results);
                });
            });

        this.router.navigate(['/youtubeHome', { 
            outlets: { 
                youtube: ['channel-view'] 
            } 
        }], { skipLocationChange: true });
    }

    public navigateToPlayer(): void {
        this.router.navigate(['/youtubeHome', { 
            outlets: { 
                youtube: ['player'] 
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

