import { Injectable } from '@angular/core';
import { HistoryVideo, VideoHistory } from './watch-history.model';
import { PlaylistVideo } from './youtube-playlist-results.model';
import { openDB } from 'idb';

@Injectable({
  providedIn: 'root'
})

export class WatchHistoryService {
    private watchHistoryDB;
    private watchHistoryTableName: string = 'watchHistory';

    private allWatchHistory: Map<string, VideoHistory>;
    private currentVideo: PlaylistVideo;

    constructor(){
        this.allWatchHistory = new Map<string, VideoHistory>;

        if(this.watchHistoryDB) return;
        this.initializeWatchHistory();
    }

    getAllWatchedVideos(): HistoryVideo[]{
        let videos: HistoryVideo[] = [];
        this.allWatchHistory.forEach((videoHistory, videoId) => {
            let video: HistoryVideo = {id: videoId, videoData: videoHistory};
            videos.push(video);
        });
        return videos;
    }

    async initializeWatchHistory(): Promise<void>{
        const tableName = this.watchHistoryTableName;
        this.watchHistoryDB = await openDB('watchHistory', 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(tableName)) {
                    db.createObjectStore(tableName);
                }
            },
        });
        let allHistoryKeys = await this.watchHistoryDB.getAllKeys(this.watchHistoryTableName);
        for(const key of allHistoryKeys){
            let history = await this.watchHistoryDB.get(this.watchHistoryTableName, key);
            let videoHistory = history as VideoHistory;
            this.allWatchHistory.set(key, videoHistory);
        }
        this.cleanOldVideos();
    }

    async storeWatchHistory(): Promise<void>{
        for(let [id, data] of this.allWatchHistory){
            this.watchHistoryDB.put(this.watchHistoryTableName, data, id);
        }
    }

    async storeSingleVideo(id: string, data: VideoHistory): Promise<void>{
        await this.watchHistoryDB.put(this.watchHistoryTableName, data, id);
    }

    saveCurrentVideo(video: PlaylistVideo): void{
        this.currentVideo = video;
    }

    getSavedVideoData(): PlaylistVideo{
        return this.currentVideo;
    }

    addSavedVideoToWatchHistory(length: number): void{
        let videoId = this.currentVideo.id;
        let historyData: VideoHistory = {length: length, currentPosition: 0, watchedAt: new Date().toISOString(), thumbnailUrl: this.currentVideo.videoThumbnailUrl, title: this.currentVideo.title, channelTitle: this.currentVideo.channelTitle, channelId: this.currentVideo.channelId};

        if(this.wasWatched(videoId)) this.allWatchHistory.delete(videoId);
        this.allWatchHistory.set(videoId, historyData);
        this.storeSingleVideo(videoId, historyData);
    }

    updateVideoProgress(currentPosition: number): void{
        let videoId = this.currentVideo.id;
        let historyData = this.allWatchHistory.get(videoId);
        historyData.currentPosition = currentPosition;
        this.storeSingleVideo(videoId, historyData);
    }

    wasWatched(videoId: string): boolean{
        return this.allWatchHistory.get(videoId) ? true : false;
    }

    getVideoProgress(videoId: string): number{
        if(!this.wasWatched(videoId)) return;

        let data = this.allWatchHistory.get(videoId);
        return data.currentPosition / data.length;
    }

    cleanOldVideos(): void{
        for(let [id, data] of this.allWatchHistory){
            if(this.isOverOneYearOld(new Date(data.watchedAt))){
                this.allWatchHistory.delete(id);
            }
        }
    }

    isOverOneYearOld(date: Date): boolean {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        return date < oneYearAgo;
    }
}

