import { google } from 'googleapis';
import 'dotenv/config';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

async function youtubeSearch(query, maxResults, nextPageToken) {
    if (!query || query.trim() === '') {
        console.error('Query must be a non-empty string');
        return {
            results: [],
            nextPageToken: null
        };
    }

    let results = [];
    let response;

    if(nextPageToken){
        response = await youtube.search.list({
            part: 'snippet',
            q: query,
            type: ['video, channel'],
            maxResults: maxResults,
            pageToken: nextPageToken,
        });
    } else {
        response = await youtube.search.list({
        part: 'snippet',
        q: query,
        type: ['video, channel'],
        maxResults: maxResults,
    });
    }

    results = results.concat(response.data.items);
    nextPageToken = response.data.nextPageToken;

    return {
        results,
        nextPageToken
    };
}

async function search(query, maxResults, nextPageToken) {
    if (!query || query.trim() === '') {
        console.error('Query must be a non-empty string');
        return {
            results: [],
            nextPageToken: null
        };
    }

    try {
        return await youtubeSearch(query, maxResults, nextPageToken);
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return {
            results: [],
            nextPageToken: null
        };
    }
}

export default {
    search: search,
};