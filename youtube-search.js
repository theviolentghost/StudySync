import { google } from 'googleapis';
import 'dotenv/config';
import { exec } from 'child_process';

 
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// async function youtubeSearch(query, maxResults, nextPageToken) {
//     if (!query || query.trim() === '') {
//         console.error('Query must be a non-empty string');
//         return {
//             results: [],
//             nextPageToken: null
//         };
//     }

//     let results = [];
//     let response;

//     if(nextPageToken){
//         response = await youtube.search.list({
//             part: 'snippet',
//             q: query,
//             type: ['video, channel'],
//             maxResults: maxResults,
//             pageToken: nextPageToken,
//         });
//     } else {
//         response = await youtube.search.list({
//         part: 'snippet',
//         q: query,
//         type: ['video, channel'],
//         maxResults: maxResults,
//     });
//     }

//     results = results.concat(response.data.items);
//     nextPageToken = response.data.nextPageToken;

//     return {
//         results,
//         nextPageToken
//     };
// }

async function search(query, maxResults, nextPageToken) {
    if (!query || query.trim() === '') {
        console.error('Query must be a non-empty string');
        return {
            results: [],
            nextPageToken: null
        };
    }

    try {
        //return await youtubeSearch(query, maxResults, nextPageToken);
        return await youtubeSearch(query);
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return { 
            results: [],
            nextPageToken: null
        };
    }
}

function youtubeSearch(query) {
  const cmd = `yt-dlp "ytsearch10:${query} --dump-json`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error("Error:", err);
      return;
    }

    const results = stdout
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
    
    console.log(results);
  });
}

export default {
    search: search,
};