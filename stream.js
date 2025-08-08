import express from 'express';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';

const __dirname = path.resolve();

class Adaptive_Stream {
    static profiles = {
        'ultra-low': { bitrate: '32k', sample_rate: 22050, channels: 1 },
        'low': { bitrate: '64k', sample_rate: 44100, channels: 1 },
        'medium': { bitrate: '128k', sample_rate: 44100, channels: 2 },
        'high': { bitrate: '192k', sample_rate: 44100, channels: 2 },
        'ultra-high': { bitrate: '256k', sample_rate: 44100, channels: 2 }
    };
    static hls_root = path.join(__dirname, 'hls');
    static stream_buffer_size = '16K'; // Buffer size for streaming

    static hls_playlist_max_timeout = 30000; // Max wait time for playlist in ms
    static hls_playlist_refresh_interval = 200; // Interval to check for playlist in ms
    static hls_playlist_segment_wait_timeout = 15000; // Max wait time for first segment in ms
    static hls_playlist_segment_interval = 100; // Interval to check for first segment in ms

    static hls_playlist_max_uphold_time = 1000 * 60 * 60; // 1 hour
    static hls_playlist_cleanup_interval = 10 * 60 * 1000; // 10 min

    setup_endpoints(app) {
        app.use('/hls', express.static(Adaptive_Stream.hls_root));

        app.get('/stream', async (req, res) => {
            // console.log(`🌐 Received stream request:`, req.query);
            
            const video_id = req.query.video_id;
            const start_time = parseInt(req.query.t || '0', 10) || 0;
 
            if (!video_id) {
                // console.error(`❌ Missing video_id in request`);
                return res.status(400).send('Missing video_id');
            }

            const video_url = `https://www.youtube.com/watch?v=${video_id}`;
            // console.log(`🎬 Processing stream request for video: ${video_id}`);

            try {
                // console.log(`🚀 Starting stream for ${video_url} from ${start_time}s`);

                const response = await this.stream(video_url, start_time, req.query.quality || 'medium');
                // console.log(`✅ Stream started successfully:`, response);
                res.json(response);

            } catch (error) {
                res.status(500).send('Error: ' + error.message);
            }
        });

        app.delete('/session/:session_id', async (req, res) => {
            const session_id = req.params.session_id;
            try {
                await this.clean(session_id);
                res.json({ success: true, message: 'Session cleaned up' });
            } catch (error) {
                res.status(500).json({ error: 'Cleanup failed: ' + error.message });
            }
        });
    }
    constructor() {
        this.xactive_processes = new Map();

        this.hls_directory_cleanup();
        setInterval(() => this.hls_directory_cleanup(), Adaptive_Stream.hls_playlist_cleanup_interval); 
    }

    async stream(url, start_time = 0, quality = 'medium') {
        const session_id = Math.random().toString(36).substring(7);    
        const session_directory = path.join(Adaptive_Stream.hls_root, session_id);

        // Ensure HLS root directory exists
        if (!fs.existsSync(Adaptive_Stream.hls_root)) {
            fs.ensureDirSync(Adaptive_Stream.hls_root);
        }
        
        if(!fs.ensureDirSync(session_directory)) {
            throw new Error('Failed to create session directory');
        }


        const playlist_path = path.join(session_directory, 'stream.m3u8');
        const profile = Adaptive_Stream.profiles[quality] || Adaptive_Stream.profiles['medium'];

        const yt_dlp = spawn('yt-dlp', [
            '-f', 'bestaudio[ext=m4a]/bestaudio/best',
            '--no-playlist',
            '--quiet',
            '--no-warnings',
            '--buffer-size', Adaptive_Stream.stream_buffer_size,  
            '--no-part',  
            '-o', '-',
            url
        ]);

        // Add yt-dlp process event listeners
        yt_dlp.on('error', (error) => {
            console.error(`yt-dlp error for session ${session_id}:`, error);
        });

        // Store the session info BEFORE starting FFmpeg
        const sessionInfo = {
            yt_dlp: yt_dlp,
            url: url,
            session_directory: session_directory,
            quality: quality,
            start_time: Date.now(),
            ffmpeg: null  // Will be set after FFmpeg starts
        };
        
        this.active_processes.set(session_id, sessionInfo);
        const ffmpeg_process = ffmpeg(yt_dlp.stdout)
            .audioCodec('aac')
            .audioBitrate(profile.bitrate)
            .audioChannels(profile.channels)
            .audioFrequency(profile.sample_rate)
            .format('hls')
            .outputOptions([
                '-hls_time 2',
                '-hls_list_size 0',
                '-hls_flags append_list',
                '-hls_allow_cache 1',
                '-hls_segment_type mpegts',
                '-start_number 0',
                '-avoid_negative_ts make_zero',
                '-fflags +genpts',
                '-map_metadata -1',
                '-reset_timestamps 1',
                '-copyts',
                '-start_at_zero',
                '-hls_segment_filename', path.join(session_directory, 'stream%d.ts')
            ])
            .output(playlist_path);
        
        // Update the session with the FFmpeg process reference
        sessionInfo.ffmpeg = ffmpeg_process;

        ffmpeg_process
            .on('error', (err) => {
                console.error(`❌ FFmpeg error for session ${session_id}:`, err);
                console.log(`🚨 FFmpeg error for session ${session_id}, keeping in active_processes for manual cleanup`);
            })

        // Start FFmpeg process
        ffmpeg_process.run();

        await this.wait_for_playlist(playlist_path);
        await this.wait_for_first_segment(session_directory);

        const result = {
            success: true,
            playlist_url: `/hls/${session_id}/stream.m3u8`,
            session_id: session_id
        };

        return result;
    }

    // Extract these as separate methods for better error handling
    async wait_for_playlist(playlist_path) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.error(`Timeout waiting for playlist: ${playlist_path}`);
                reject(new Error('Timeout waiting for playlist'));
            }, Adaptive_Stream.hls_playlist_max_timeout);
            
            const check = () => {
                if (fs.existsSync(playlist_path)) {
                    clearTimeout(timeout);
                    resolve();
                } else {

                    setTimeout(check, Adaptive_Stream.hls_playlist_refresh_interval);
                }
            };
            check();
        });
    }

    async wait_for_first_segment(session_directory) {
        const segment_path = path.join(session_directory, 'stream0.ts');
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.error(`Timeout waiting for first segment: ${segment_path}`);
                reject(new Error('Timeout waiting for first segment'));
            }, Adaptive_Stream.hls_playlist_segment_wait_timeout);
            
            const check = () => {
                if (fs.existsSync(segment_path)) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    setTimeout(check, Adaptive_Stream.hls_playlist_segment_interval);
                }
            };
            check();
        });
    }

    async clean(session_id) {
        const session = this.active_processes.get(session_id);
        
        if (!session) {
            console.log(`Session ${session_id} not found in active_processes`);
            return;
        }

        const { ffmpeg, yt_dlp, session_directory } = session;

        // Cleanup processes
        try {
            if (ffmpeg && typeof ffmpeg.kill === 'function') {
                ffmpeg.kill('SIGTERM');
                console.log(`Killed FFmpeg process for session ${session_id}`);
            }
            if (yt_dlp && typeof yt_dlp.kill === 'function') {
                yt_dlp.kill('SIGTERM');
                console.log(`Killed yt-dlp process for session ${session_id}`);
            }
        } catch (e) {
            console.error('Error terminating processes:', e);
        }

        // Cleanup files
        try {
            if (fs.existsSync(session_directory)) {
                fs.removeSync(session_directory);
                console.log(`Removed session directory: ${session_directory}`);
            }
        } catch (e) {
            console.error('Error removing session directory:', e);
        }

        // Remove from active processes
        this.active_processes.delete(session_id);
    }

    async hls_directory_cleanup() {
        // cleanup old sessions
        const sessions = fs.readdirSync(Adaptive_Stream.hls_root).filter(dir => 
            fs.statSync(path.join(Adaptive_Stream.hls_root, dir)).isDirectory()
        );

        const now = Date.now();
        for (const session_id of sessions) {
            const session = this.active_processes.get(session_id);
            if (session) {
                const age = now - session.start_time;
                if (age > Adaptive_Stream.hls_playlist_max_uphold_time) {
                    await this.clean(session_id);
                    console.log(`Cleaned up old session: ${session_id} that was active for ${Math.floor(age / 1000)} seconds`);
                }
            } else {
                // If no active process, remove the directory
                const session_directory = path.join(Adaptive_Stream.hls_root, session_id);
                try {
                    if (fs.existsSync(session_directory)) {
                        fs.removeSync(session_directory);
                        console.log(`Removed stale session directory: ${session_id}`);
                    }
                } catch (e) {
                    console.error('Error removing stale session directory:', e);
                }
            }
        }
    }

    health() {
        const sessions = fs.readdirSync(Adaptive_Stream.hls_root).filter(dir => 
            fs.statSync(path.join(Adaptive_Stream.hls_root, dir)).isDirectory()
        );
        
        const activeProcessCount = this.active_processes.size;
        
        return {
            status: 'healthy',
            activeSessions: sessions.length,
            activeProcesses: activeProcessCount,
            sessions: sessions
        };
    }

    // Add a debug method to check active processes
    debug_active_processes() {
        console.log('=== ACTIVE PROCESSES DEBUG ===');
        console.log(`Total active processes: ${this.active_processes.size}`);
        
        for (const [session_id, session] of this.active_processes.entries()) {
            console.log(`Session ${session_id}:`, {
                url: session.url,
                quality: session.quality,
                age: Math.floor((Date.now() - session.start_time) / 1000) + 's',
                hasFFmpeg: !!session.ffmpeg,
                hasYtDlp: !!session.yt_dlp
            });
        }
        console.log('==============================');
    }
}

const stream = new Adaptive_Stream();

export default stream;