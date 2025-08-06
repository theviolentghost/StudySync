export interface VideoHistory{
    length: number;
    currentPosition: number;
    watchedAt: string;
    thumbnailUrl: string;
    title: string;
    channelName: string;
    channelId: string;
}

export interface HistoryVideo{
    id: string;
    videoData: VideoHistory;
}