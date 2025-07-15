import { google } from 'googleapis';
import 'dotenv/config';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// async function getChannelPlaylists(channelId) {
//   try {
//     let nextPageToken = '';
//     const allPlaylists = [];

//     const response = await youtube.playlists.list({
//         part: ['snippet', 'contentDetails'],
//         channelId: channelId,
//         maxResults: 50, 
//         pageToken: nextPageToken,
//     });

//     allPlaylists.push(...response.data.items);
//    //nextPageToken = response.data.nextPageToken;

//     return allPlaylists;
//   } catch (error) {
//     console.error('Error fetching playlists:', error);
//     return [];
//   }
// }

async function getPlaylistVideos(playlistId, nextPageToken){
  if(!nextPageToken) nextPageToken = '';
  console.log(nextPageToken);
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
    //getChannelPlaylists: getChannelPlaylists,
}

