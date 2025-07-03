import fs_sync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';
import { google } from 'googleapis';
import { YtDlp } from 'ytdlp-nodejs';
import progress_emitter from './progress.emitter.js';
import { spawn } from 'child_process';
import axios from 'axios';

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

async function search_for_videos(query = 'NoCopyrightSounds', total_results = 120, next_page_token = undefined, enhance_search = true) {
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
            maxResults: Math.min(200, total_results - results.length),
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

async function search_for_artists(query = 'NoCopyrightSounds', total_results = 16, next_page_token = undefined) {
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
            maxResults: Math.min(40, total_results - results.length), // YouTube API max is 50 per request
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
            search_for_videos(query, 50, undefined, false),
            search_for_artists(query, 16)
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

async function download_audio_artwork_to_stream(res, youtube_video_id) {
    try {
        // Get video info to extract thumbnail URL
        const ytdlpArgs = [
            '--dump-json',
            '--no-playlist',
            '--quiet',
            `https://www.youtube.com/watch?v=${youtube_video_id}`
        ];

        const ytdlp = spawn('yt-dlp', ytdlpArgs);
        let output = '';
        let error = '';

        ytdlp.stdout.on('data', (data) => {
            output += data.toString();
        });

        ytdlp.stderr.on('data', (data) => {
            error += data.toString();
        });

        ytdlp.on('close', async (code) => {
            if (code !== 0) {
                console.error('yt-dlp failed:', error);
                res.status(500).send('Error fetching video info');
                return;
            }

            try {
                const videoInfo = JSON.parse(output);
                
                // Get the best quality thumbnail
                let thumbnailUrl = null;
                
                if (videoInfo.thumbnails && videoInfo.thumbnails.length > 0) {
                    // Sort thumbnails by resolution (highest first)
                    const sortedThumbnails = videoInfo.thumbnails
                        .filter(thumb => thumb.url && (thumb.width || thumb.height))
                        .sort((a, b) => {
                            const aRes = (a.width || 0) * (a.height || 0);
                            const bRes = (b.width || 0) * (b.height || 0);
                            return bRes - aRes;
                        });
                    
                    thumbnailUrl = sortedThumbnails[0]?.url;
                }
                
                // Fallback to maxresdefault if no thumbnails found
                if (!thumbnailUrl) {
                    thumbnailUrl = `https://img.youtube.com/vi/${youtube_video_id}/maxresdefault.jpg`;
                }

                // Stream the image
                const response = await axios({
                    method: 'GET',
                    url: thumbnailUrl,
                    responseType: 'stream',
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                // Set appropriate headers
                res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
                
                if (response.headers['content-length']) {
                    res.setHeader('Content-Length', response.headers['content-length']);
                }

                // Pipe the image data to response
                response.data.pipe(res);

                response.data.on('error', (streamError) => {
                    console.error('Error streaming artwork:', streamError);
                    if (!res.headersSent) {
                        res.status(500).send('Error streaming artwork');
                    }
                });

            } catch (parseError) {
                console.error('Error parsing video info:', parseError);
                res.status(500).send('Error parsing video information');
            }
        });

    } catch (error) {
        console.error('Error fetching artwork:', error);
        if (!res.headersSent) {
            res.status(500).send('Error fetching artwork');
        }
    }
}

// Get direct audio URL from YouTube with customizable quality
async function get_audio_url(videoId, options = {quality: '0', bit_rate: '192K', format: 'mp3'}) {
  return new Promise((resolve, reject) => {
    // Build format string that EXCLUDES HLS streams
    let formatString;
    
    if (options.format === 'mp3' || options.format === 'audio') {
      // Exclude HLS and prefer direct audio files
      formatString = 'bestaudio[protocol!=m3u8][ext!=m3u8]';
      
      // If specific quality is requested (0-9, with 0 being best)
      if (options.quality && options.quality !== '0') {
        formatString += `[abr<=${getAudioBitrateForQuality(options.quality)}]`;
      }
      
      // Add fallbacks that also exclude HLS
      formatString += '/bestaudio[protocol!=m3u8]/best[protocol!=m3u8]/bestaudio/best';
    } else {
      // Direct format selection with HLS exclusion
      formatString = 'bestaudio[ext=m4a][protocol!=m3u8]/bestaudio[ext=webm][protocol!=m3u8]/bestaudio[protocol!=m3u8]/best[protocol!=m3u8]';
    }
    
    const ytdlpArgs = [
      '--format', formatString,
      '--get-url',
      '--no-playlist',
      '--quiet',
      '--no-warnings'
    ];
    
    // Don't add postprocessor args when just getting URL
    // (postprocessor args are for actual downloads, not URL extraction)
    
    // Add video ID
    ytdlpArgs.push(`https://www.youtube.com/watch?v=${videoId}`);
    
    console.log('yt-dlp command:', 'yt-dlp', ytdlpArgs.join(' '));
    
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
        
        // Check if we still got an HLS URL (fallback)
        if (url.includes('.m3u8') || url.includes('manifest')) {
          resolve('');
          return;
        }
        
        // console.log(`Got direct audio URL for ${videoId}: ${url.substring(0, 100)}...`);
        progress_emitter.emit(`${videoId}_got_url`, { url, options });
        resolve(url);
      } else {
        resolve('');
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
        let audio_url = await get_audio_url(youtube_video_id);
        if (!audio_url) {
            //for direct streaming
            audio_url = `/music/stream/${youtube_video_id}`;
        }
        console.log(`Streaming audio for ${youtube_video_id} from URL: ${audio_url}`);

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
    get_artwork: download_audio_artwork_to_stream,
};