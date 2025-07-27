import { Injectable } from '@angular/core';
import { VideoHistory } from './watch-history.model';
import { YoutubeService } from './youtube.service';

@Injectable({
  providedIn: 'root'
})

export class WatchHistoryService {
    private allWatchHistory: Map<string, VideoHistory>;

    constructor(private youtubeService: YoutubeService){}

    initializeWatchHistory(): void{
        //load from db
        this.cleanOldVideos();
    }

    addToWatchHistory(videoId: string, historyData: VideoHistory): void{
        this.allWatchHistory.set(videoId, historyData);
    }

    updateVideoProgress(videoId: string, historyData: VideoHistory): void{
        if(!this.wasWatched(videoId)) this.addToWatchHistory(videoId, historyData);

        this.allWatchHistory.get(videoId).currentPosition = historyData.currentPosition;
    }

    wasWatched(videoId: string): boolean{
        return this.allWatchHistory.has(videoId);
    }

    getVideoProgress(videoId: string): number{
        if(!this.wasWatched(videoId)) return;

        let data = this.allWatchHistory.get(videoId);
        return data.currentPosition / data.length;
    }

    cleanOldVideos(): void{
        for(let [id, data] of this.allWatchHistory){
            if(this.youtubeService.timeAgo(data.watchedAt).includes('year')){
                this.allWatchHistory.delete(id);
            }
        }
    }
}

