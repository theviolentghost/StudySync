import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { SubscriptionData } from './youtube-channel-search-results.model';

@Injectable({
  providedIn: 'root'
})
export class YoutubeSubscriptionService{

    private SUBSCRIPTION_LIST_KEY = 'subscriptionListKey';

    private initialized = false;

    private allSubscriptions: SubscriptionData[];
    private channelIdList: string[];

    constructor(private http: HttpClient){
        if(!this.initialized) this.channelIdList = this.getSubscriptionList();
        this.initialized = true;
    }

    public subscribeToChannel(channelId: string): void{
        if(!this.channelIdList) this.channelIdList = [];
        if(this.isSubscribed(channelId)) return;

        this.channelIdList.push(channelId);
        this.saveSubscriptionList();
        console.log(this.channelIdList);
    }

    public unsubscribeToChannel(channelId: string): void{
        if(!this.channelIdList) return;
        this.channelIdList = this.channelIdList.filter(element => element !== channelId);
        this.saveSubscriptionList();
    }

    saveSubscriptionList(): void{
        if(!this.channelIdList) return;
        localStorage.setItem(this.SUBSCRIPTION_LIST_KEY, JSON.stringify(this.channelIdList));
    }

    public getSubscriptionList(): string[]{
        return JSON.parse(localStorage.getItem(this.SUBSCRIPTION_LIST_KEY));
    }

    public isSubscribed(channelId: string): boolean{
        if(!this.channelIdList) return false;
        return this.channelIdList.includes(channelId);
    }
}

