import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { YouTubeSearchResponse, SearchResultItem } from './video-search-result.model';
import { YouTubeChannel } from './youtube-channel-search-results.model';

@Injectable({
  providedIn: 'root'
})
export class YoutubeService {

    private _videoPlayerWidth = 0;
    private backendURL = "http://localhost:3000";

    private nextSearchPageToken: string;
    private searchList: SearchResultItem[];

    private resultsSubject = new BehaviorSubject<SearchResultItem[] | null>(null);
    results$: Observable<SearchResultItem[] | null> = this.resultsSubject.asObservable();

    private videoUrlSubject = new BehaviorSubject<string | null>(null);
    videoUrl$: Observable<string | null> = this.videoUrlSubject.asObservable();
    private minimizedSubject = new BehaviorSubject<boolean | null>(null);
    videoMinimized$: Observable<boolean | null> = this.minimizedSubject.asObservable();
    private videoWidthSubject = new BehaviorSubject<number | null>(null);
    videoWidth$: Observable<number | null> = this.videoWidthSubject.asObservable();
    private videoYSubject = new BehaviorSubject<number | null>(null);
    videoY$: Observable<number | null> = this.videoYSubject.asObservable();

    private channelSubject = new BehaviorSubject<YouTubeChannel | null>(null);
    channel$: Observable<YouTubeChannel | null> = this.channelSubject.asObservable();

    constructor(private http: HttpClient) { }

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

    set videoPlayerWidth(number: number){
        this.videoWidthSubject.next(number);
    }

    set videoPlayerY(number: number){
        this.videoYSubject.next(number);
    }

    set channel(channel: YouTubeChannel){
        this.channelSubject.next(channel);
    }

    minimizePlayer(){
        this.minimizedSubject.next(true);
    }

    playNewVideo(url :string):void{
        this.minimizedSubject.next(false);
        this.videoUrlSubject.next(url);
    }

    saveNextSearchToken(token: string): void{
        this.nextSearchPageToken = token;
    }

    replaceSearchList(list :SearchResultItem[]):void{
        this.searchList = list;
        this.resultsSubject.next(this.searchList);
    }

    addToSearchList(list :SearchResultItem[]): void{
        this.searchList.push(...list);
        this.resultsSubject.next(this.searchList);
    }

    saveCurrentChannel(channel: YouTubeChannel){
        this.channelSubject.next(channel);
    }
}

