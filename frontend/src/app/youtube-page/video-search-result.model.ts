export interface Thumbnail {
  url: string;
}

export interface SearchSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    default: Thumbnail;
    medium: Thumbnail;
    high: Thumbnail;
  };
  channelTitle: string;
  liveBroadcastContent: string;
  publishTime: string;
}

export interface SearchResultId {
  kind: string;
  videoId?: string;
  channelId?: string;
  playlistId?: string;
}

export interface SearchResultItem {
  kind: string;
  etag: string;
  id: SearchResultId;
  snippet: SearchSnippet;
}

export interface YouTubeSearchResponse {
  nextPageToken?: string;
  reults: SearchResultItem[];
}