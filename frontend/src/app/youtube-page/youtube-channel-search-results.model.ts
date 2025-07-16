import { PlaylistVideo } from "./youtube-playlist-results.model";

export interface YouTubeChannel {
  id: string;
  snippet: ChannelSnippet;
  statistics: ChannelStatistics;
  contentDetails: ChannelContentDetails;
  brandingSettings: BrandingSettings;
}

export interface ChannelSnippet {
  title: string;
  description: string;
  thumbnails: ChannelThumbnails;
  customUrl: String;
}

export interface ChannelThumbnails {
  default: Thumbnail;
  medium?: Thumbnail;
  high?: Thumbnail;
}

export interface Thumbnail {
  url: string;
}

export interface ChannelStatistics {
  viewCount: string;
  subscriberCount: string;
  videoCount: string;
}

export interface ChannelContentDetails {
  relatedPlaylists: {
    uploads: string;
    likes?: string;
  };
}

export interface BrandingSettings {
  image: {
    bannerExternalUrl: string;
    bannerMobileExtraHdImageUrl?: string;
    bannerTvImageUrl?: string;
  };
}

export interface SubscriptionData{
  channelId: string;
  uploadsId: string;
  iconUrl: string;

}
