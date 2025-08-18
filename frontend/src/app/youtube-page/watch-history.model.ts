export interface VideoHistory{
    length: number;
    currentPosition: number;
    watchedAt: string;
    thumbnailUrl: string;
    title: string;
    channelTitle: string;
    channelId: string;
}

export interface HistoryVideo{
    id: string;
    videoData: VideoHistory;
}