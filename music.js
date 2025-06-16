import fs_sync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

import { YtDlp } from 'ytdlp-nodejs';
const Downloader = new YtDlp();

import { google } from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

async function get_audio_file(audio_path = '') {
    try {
        audio_path = path.join('storage', 'uploads', audio_path);
        await fs.access(audio_path, fs_sync.constants.R_OK);
        const stat = await fs.stat(audio_path);
        if (!stat.isFile()) {
            throw new Error('Path is not a file');
        }
        // Read the file as a buffer
        const data = await fs.readFile(audio_path);
        return data;
    } catch (error) {
        console.error('Error importing fs:', error);
        return null;
    }
}

function ensure_quality_in_query(query) {
    const lower = query.toLowerCase();
    const keywords = ['lyrics', 'original', 'official audio'];
    let enhanced = query;

    keywords.forEach(keyword => {
        if (!lower.includes(keyword)) {
            enhanced += ` ${keyword}`;
        }
    });

    return enhanced.trim();
}

async function search_for_videos(query = 'NoCopyrightSounds', total_results = 100, enhance_search = true) {
    if (!query || query.trim() === '') {
        console.error('Query must be a non-empty string');
        return [];
    }

    if (enhance_search) query = ensure_quality_in_query(query);

    let results = [];
    let next_page_token = undefined;

    while (results.length < total_results) {
        const response = await youtube.search.list({
            part: ['id', 'snippet'],
            q: query,
            type: ['video'],
            videoCategoryId: '10',
            maxResults: Math.min(50, total_results - results.length),
            pageToken: next_page_token,
        });

        results = results.concat(response.data.items);
        next_page_token = response.data.nextPageToken;

        if (!next_page_token) break; // No more pages
    }

    return results;
}

async function search_for_artists(query = 'NoCopyrightSounds', max_results = 10) {
    const response = await youtube.search.list({
        part: ['id', 'snippet'],
        q: query,
        type: ['channel'],
        maxResults: max_results,
    });

    return response;
}

/*
32K
64K
96K
128K
160K
192K
224K
256K
320K
*/ 
async function download_audio(youtube_video_id, options = {quality: '0', bit_rate: '192K'}) {
    try {
        const download_options = {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: options.quality || '0',
            output: 'storage/uploads/%(title)s.%(ext)s',
            args: [
                '--postprocessor-args', `ffmpeg:-b:a ${options.bit_rate}`,
                '--embed-thumbnail',
                '--embed-metadata',
            ],
        };

        console.log('Downloading audio for video ID:', `https://www.youtube.com/watch?v=${youtube_video_id}`);

        await Downloader.downloadAsync(`https://www.youtube.com/watch?v=${youtube_video_id}`, download_options);
    } catch (error) {
        console.error('Error downloading audio:', error);
        throw error;
    }
}

async function test() {
    try {
        console.time('search_for_videos');
        const videos = await search_for_videos('nocopyrightsounds', 30, true);
        console.timeEnd('search_for_videos');

        console.log(videos)

        // videos.forEach(element => {
        //     console.log('downloading')
        //     download_audio(element.id.videoId, {quality: '0', bit_rate: '192K'});
        // });
    } catch (error) {
        console.error('Test Error:', error);
    }
}

test();

export default {
    get: get_audio_file,
    search: search_for_videos,
    search_artists: search_for_artists,
    download: download_audio,
}