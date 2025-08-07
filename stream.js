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
            const video_id = req.query.video_id;
            const start_time = parseInt(req.query.t || '0', 10) || 0;

            if (!video_id) return res.status(400).send('Missing video_id');

            const video_url = `https://www.youtube.com/watch?v=${video_id}`;

            try {
                console.log(`Starting stream for ${video_url} from ${start_time}s`);

                const response = await stream.stream(video_url, start_time, req.query.quality || 'medium');
                res.json(response);

            } catch (error) {
                console.error('Streaming error:', error);
                res.status(500).send('Error: ' + error.message);
            }
        });

        app.delete('/session/:session_id', async (req, res) => {
            const session_id = req.params.session_id;
            try {
                await stream.clean(session_id);
                res.json({ success: true, message: 'Session cleaned up' });
            } catch (error) {
                res.status(500).json({ error: 'Cleanup failed: ' + error.message });
            }
        });
    }
    constructor() {
        this.active_processes = new Map();

        this.hls_directory_cleanup();
        setInterval(() => this.hls_directory_cleanup(), Adaptive_Stream.hls_playlist_cleanup_interval); 
    }

    async stream(url, start_time = 0, quality = 'medium') {
        const session_id = Math.random().toString(36).substring(7);
        const session_directory = path.join(Adaptive_Stream.hls_root, session_id);
        if(!fs.ensureDirSync(session_directory)) throw new Error('Failed to create session directory');

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
                '-avoid_negative_ts make_zero',      // ✅ Already there
                '-fflags +genpts',                   // ✅ Already there
                '-map_metadata -1',                  // 🆕 Remove metadata timestamps
                '-reset_timestamps 1',               // 🆕 Reset all timestamps to 0
                '-copyts',                          // 🆕 Copy timestamps but reset them
                '-start_at_zero',                   // 🆕 Ensure output starts at zero
                '-hls_segment_filename', path.join(session_directory, 'stream%d.ts')
            ])
            .output(playlist_path);
        
        ffmpeg_process
            // .on('start', (command) => {
            //     console.log('FFmpeg started:', command);
            // })
            // .on('progress', (progress) => {
            //     console.log(`Processing: ${progress.timemark} (${progress.percent || 0}%)`);
            // })
            // .on('end', () => {
            //     console.log('HLS generation completed');
            // })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                if (!res.headersSent) {
                res.status(500).send('Streaming error: ' + err.message);
                }
            });

        // Start FFmpeg process
        ffmpeg_process.run();

        // wait for playlist
        const wait_for_playlist = () => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout waiting for playlist')), Adaptive_Stream.hls_playlist_max_timeout);
                
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
        };

        await wait_for_playlist();

        // Wait for at least the first segment to be created
        const wait_for_first_segment = () => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout waiting for first segment')), Adaptive_Stream.hls_playlist_segment_wait_timeout);
                
                const check = () => {
                    const segment_path = path.join(session_directory, 'stream0.ts');
                    if (fs.existsSync(segment_path)) {
                        clearTimeout(timeout);
                        resolve();
                    } else {
                        setTimeout(check, Adaptive_Stream.hls_playlist_segment_interval);
                    }
                };
                check();
            });
        };

        await wait_for_first_segment();

        // Store process references for later cleanup
        this.active_processes.set(session_id, {
            ffmpeg: ffmpeg_process,
            yt_dlp: yt_dlp,
            url: url,
            session_directory: session_directory,
            quality: quality,
            startTime: Date.now()
        });

        return {
            success: true,
            playlist_url: `/hls/${session_id}/stream.m3u8`,
            session_id: session_id
        };
    }

    async seek(session_id, time) {
        // to implement
        const session = this.active_processes.get(session_id);
        if (!session) {
            throw new Error('Session not found');
        }

        this.clean(session_id); // Clean up the session before seeking

        this.stream(session.url, time, session.quality);
        return {
            success: true,
            playlist_url: `/hls/${session_id}/stream.m3u8`,
            session_id: session_id
        };
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

    async clean(session_id) {
        const session = this.active_processes.get(session_id);
        if (session) {
            const { ffmpeg, yt_dlp, session_directory } = session;

            //cleanup processes
            try {
                ffmpeg.kill('SIGTERM');
                yt_dlp.kill('SIGTERM');
            } catch (e) {
                console.error('Error terminating processes:', e);
            }

            //cleanup files
            try {
                if (fs.existsSync(session_directory)) {
                    fs.removeSync(session_directory);
                }
            } catch (e) {
                console.error('Error removing session directory:', e);
            }

            // Remove from active processes
            this.active_processes.delete(session_id);
        }
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
                const age = now - session.startTime;
                if (age > Adaptive_Stream.hls_playlist_max_uphold_time) { // 1 hour
                    await this.clean(session_id);
                    this.active_processes.delete(session_id);
                    console.log(`Cleaned up old session: ${session_id}`);
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
}

const stream = new Adaptive_Stream();

export default stream;