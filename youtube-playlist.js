import { google } from 'googleapis';
import 'dotenv/config';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

async function getPlaylistVideos(playlistId, nextPageToken){
  if(!nextPageToken) nextPageToken = '';
  try{
      const response = await youtube.playlistItems.list({
          part: ['snippet', 'contentDetails'],
          playlistId: playlistId,
          maxResults: 10,
          pageToken: nextPageToken
      });

      return {
        results: response.data.items,
        nextPageToken: response.data.nextPageToken
      };

  }catch(error){
      console.error('Error fetching playlists:', error);
      return;
  }
}

export default{
    getPlaylistVideos: getPlaylistVideos,
}

