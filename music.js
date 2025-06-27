import fs_sync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';
import { google } from 'googleapis';
import { YtDlp } from 'ytdlp-nodejs';
import progress_emitter from './progress.emitter.js';
import { spawn } from 'child_process';

const Downloader = new YtDlp({
    cwd: process.cwd(),
    shell: false,
    windowsHide: true,
    detached: false
});

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
        const data = await fs.readFile(audio_path);
        return data;
    } catch (error) {
        console.error('Error reading audio file:', error);
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

async function search_for_videos(query = 'NoCopyrightSounds', total_results = 40, next_page_token = undefined, enhance_search = true) {
    if (!query || query.trim() === '') {
        console.error('Query must be a non-empty string');
        return {
            results: [],
            total: 0,
            next_page_token: null
        };
    }

    if (enhance_search) query = ensure_quality_in_query(query);

    let results = [];

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

        if (!next_page_token) break;
    }

    return {
        results,
        total: results.length,
        next_page_token
    };
}

async function search_for_artists(query = 'NoCopyrightSounds', total_results = 40, next_page_token = undefined) {
    if (!query || query.trim() === '') {
        console.error('Query must be a non-empty string');
        return {
            results: [],
            total: 0,
            next_page_token: null
        };
    }

    let results = [];

    while (results.length < total_results) {
        const response = await youtube.search.list({
            part: ['id', 'snippet'],
            q: query,
            type: ['channel'],
            maxResults: Math.min(50, total_results - results.length), // YouTube API max is 50 per request
            pageToken: next_page_token,
        });

        results = results.concat(response.data.items);
        next_page_token = response.data.nextPageToken;

        // Break if no more pages available
        if (!next_page_token) break;
    }

    return {
        results,
        total: results.length,
        next_page_token
    };
}

async function search(query = 'NoCopyrightSounds', /* add more params in future */) {
    if (!query || query.trim() === '') {
        console.error('Query must be a non-empty string');
        return {
            videos: {},
            artists: {},
        };
    }

    try {
        return Promise.all([
            search_for_videos(query, 40),
            search_for_artists(query, 40)
        ]).then(([videos, artists]) => {
            return {
                videos,
                artists
            };
        });
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return {
            videos: {},
            artists: {}
        };
    }
}










//
//
// media

async function download_audio(youtube_video_id, options = {quality: '0', bit_rate: '192K'}) {
    try {
        const download_options = {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: options.quality || '0',
            output: 'storage/uploads/%(title)s.%(ext)s',
            args: [
                '--postprocessor-args', `ffmpeg:-b:a ${options.bit_rate}`,
            ],
        };

        console.log('Downloading audio for video ID:', `https://www.youtube.com/watch?v=${youtube_video_id}`);
        await Downloader.downloadAsync(`https://www.youtube.com/watch?v=${youtube_video_id}`, download_options);
    } catch (error) {
        console.error('Error downloading audio:', error);
        throw error;
    }
}

async function download_audio_to_stream(res, youtube_video_id, options = {quality: '0', bit_rate: '192K'}) {
    const download_options = {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: options.quality || '0',
        output: '-',
        args: [
            '--postprocessor-args', `ffmpeg:-b:a ${options.bit_rate}`,
        ],
    };

    const downloadProcess = Downloader.download(
        `https://www.youtube.com/watch?v=${youtube_video_id}`,
        download_options
    );

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache'); 

    downloadProcess.stdout.pipe(res);

    downloadProcess.stderr.on('data', (data) => {
        const str = data.toString();
        if (str.trim().startsWith('bright-')) {
            try {
                const progress = JSON.parse(str.trim().replace(/^bright-/, ''));
                progress_emitter.emit(youtube_video_id, progress);
            } catch (error) {}
        }
    });

    downloadProcess.on('close', (code) => {
        if (code !== 0) {
            res.end();
        }
        progress_emitter.emit(`${youtube_video_id}_done`);
    });
}

// Get direct audio URL from YouTube with customizable quality
async function get_audio_url(videoId, options = {quality: '0', bit_rate: '192K', format: 'mp3'}) {
  return new Promise((resolve, reject) => {
    // Build format string based on options
    let formatString;
    
    if (options.format === 'mp3' || options.format === 'audio') {
      // For MP3/audio, use bestaudio with quality preference
      formatString = 'bestaudio';
      
      // If specific quality is requested (0-9, with 0 being best)
      if (options.quality && options.quality !== '0') {
        formatString += `[abr<=${getAudioBitrateForQuality(options.quality)}]`;
      }
      
      // Add fallbacks
      formatString += '/bestaudio/best';
    } else {
      // Direct format selection (for advanced users)
      formatString = options.format || 'bestaudio[ext=m4a]/bestaudio/best';
    }
    
    const ytdlpArgs = [
      '--format', formatString,
      '--get-url',
      '--no-playlist',
      '--quiet'
    ];
    
    // Add audio conversion args if needed
    if (options.bit_rate) {
      ytdlpArgs.push(
        '--postprocessor-args', 
        `ffmpeg:-b:a ${options.bit_rate}`
      );
    }
    
    // Add video ID
    ytdlpArgs.push(`https://www.youtube.com/watch?v=${videoId}`);
    
    // Run yt-dlp command
    const ytdlp = spawn('yt-dlp', ytdlpArgs);

    let output = '';
    let error = '';

    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      error += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0) {
        const url = output.trim();
        progress_emitter.emit(`${videoId}_got_url`, { url, options });
        resolve(url);
      } else {
        reject(new Error(`yt-dlp failed: ${error}`));
      }
    });
  });
}

// Helper function to convert quality level (0-9) to approximate bitrate
function getAudioBitrateForQuality(quality) {
  const qualityMap = {
    '0': '320K',  // Best
    '1': '256K',
    '2': '192K',
    '3': '160K',
    '4': '128K',
    '5': '96K',
    '6': '64K',
    '7': '48K',
    '8': '32K',
    '9': '24K'    // Worst
  };
  
  return qualityMap[quality] || '192K';
}

async function stream_audio(res, youtube_video_id) {
    try {
        const audio_url = await get_audio_url(youtube_video_id);

        res.status(200).json({url: audio_url});
    } catch (error) {
        console.error(`Error streaming audio for ${youtube_video_id}:`, error);
        if (!res.headersSent) {
            res.status(500).send('Error starting audio stream');
        } else if (!res.writableEnded) {
            res.end();
        }
    }
}

export default {
    get: get_audio_file,
    search: search,
    search_videos: search_for_videos,
    search_artists: search_for_artists,
    download: download_audio,
    download_stream: download_audio_to_stream,
    stream: stream_audio,
};