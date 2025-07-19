import { SearchResultItem, YouTubeSearchResponse } from "./video-search-result.model";

export interface Playlist{
    name: string
    list: SearchResultItem[];
    nextPageToken: string
}

export interface PlaylistVideo{
    contentDetails: ContentDetails;
    snippet: PlaylistSnippet
}

export interface ContentDetails{
    videoId: string;
    videoPublishedAt: string;
}

export interface Thumbnail {
  url: string;
}

export interface PlaylistSnippet {
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
  publishedAt: string;
  playlistId: string;
}
