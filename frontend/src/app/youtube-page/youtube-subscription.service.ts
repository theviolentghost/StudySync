import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { SubscriptionData } from './youtube-channel-search-results.model';
import { BehaviorSubject, Observable, take } from 'rxjs';
import { YoutubeService } from './youtube.service';

@Injectable({
  providedIn: 'root'
})
export class YoutubeSubscriptionService{

    private SUBSCRIPTION_LIST_KEY = 'subscriptionListKey';

    private initialized = false;

    private _allSubscriptions: SubscriptionData[] = [];
    private _channelIdList: string[];

    private channelDataListSubject = new BehaviorSubject<SubscriptionData[] | null>(null);
    channelDataList$: Observable<SubscriptionData[] | null> = this.channelDataListSubject.asObservable();

    constructor(private http: HttpClient,
        private youtubeService: YoutubeService
    ){
        if(this.initialized) return;
        this.initialized = true;

        this._channelIdList = this.getSubscriptionList();

        let tempSubscriptionList: SubscriptionData[] = [];
        for(let channel = 0; channel < this.channelIdList.length; channel++){
            this.addToSubscriptionList(this.channelIdList[channel]);
        }
    }

    get channelIdList(): string[]{
        return this._channelIdList;
    }

    set allSubscriptions(list: SubscriptionData[]){
        this._allSubscriptions = list;
        this.channelDataListSubject.next(this._allSubscriptions);
    }

    public addToSubscriptionList(channelId: string): void{
        
        this.youtubeService.getFullChannel(channelId)
                    .pipe(take(1))
                    .subscribe(data => {
                        let uploadsId = data.contentDetails.relatedPlaylists.uploads;
                        let iconUrl = data.snippet.thumbnails.high.url;

                        let subcription: SubscriptionData = {channelId: channelId, uploadsId: uploadsId, iconUrl: iconUrl}
                        this._allSubscriptions.push(subcription);
                        this.allSubscriptions = this._allSubscriptions;
                    });
    }

    public conditionalAddTosubscriptionList(channelId: string): void{
        for(let i = 0; i < this._allSubscriptions.length; i++){
            if(this._allSubscriptions[i].channelId == channelId) return;
        }

        this.addToSubscriptionList(channelId);
    }

    public subscribeToChannel(channelId: string): void{
        if(!this._channelIdList) this._channelIdList = [];
        if(this.isSubscribed(channelId)) return;

        this.conditionalAddTosubscriptionList(channelId);

        this._channelIdList.push(channelId);
        this.saveSubscriptionList();
    }

    public unsubscribeToChannel(channelId: string): void{
        if(!this.channelIdList) return;
        this._channelIdList = this._channelIdList.filter(element => element !== channelId);
        this.saveSubscriptionList();
    }

    saveSubscriptionList(): void{
        if(!this.channelIdList) return;
        localStorage.setItem(this.SUBSCRIPTION_LIST_KEY, JSON.stringify(this._channelIdList));
    }

    public getSubscriptionList(): string[]{
        return JSON.parse(localStorage.getItem(this.SUBSCRIPTION_LIST_KEY));
    }

    public isSubscribed(channelId: string): boolean{
        if(!this.channelIdList) return false;
        return this.channelIdList.includes(channelId);
    }
}

