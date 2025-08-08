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
    static profile_progression = ['ultra-low', 'low', 'medium', 'high', 'ultra-high']; // Order of profiles for adaptive streaming
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

        // Standard adaptive quality stream
        app.get('/stream', async (req, res) => {
            const video_id = req.query.video_id;
            const start_time = parseInt(req.query.t || '0', 10) || 0;
            const target_quality = req.query.quality || 'medium';
            const initial_quality = req.query.initial_quality || 'ultra-low';

            if (!video_id) return res.status(400).send('Missing video_id');

            const video_url = `https://www.youtube.com/watch?v=${video_id}`;

            try {
                // console.log(`Starting stream for ${video_url} from ${start_time}s`);

                const response = await this.stream(video_url, start_time, target_quality, initial_quality);
                res.json(response);

            } catch (error) {
                console.error('Streaming error:', error);
                res.status(500).send('Error: ' + error.message);
            }
        });

        app.get('/music/duration', async (req, res) => {
            const video_id = req.query.video_id;
            if (!video_id) return res.status(400).send('Missing video_id'); 
            const video_url = `https://www.youtube.com/watch?v=${video_id}`;
            try {
                const duration_str = await this.get_duration(video_url);
                const duration_ms = this.parse_duration(duration_str);
                res.json({ duration: duration_ms });
            } catch (error) {
                console.error('Error getting duration:', error);
                res.status(500).send('Error: ' + error.message);
            }
        });

        // Get session status (useful for checking upgrade progress)
        app.get('/session/:session_id/status', (req, res) => {
            const session_id = req.params.session_id;
            const session = this.active_processes.get(session_id);
            
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }

            res.json({
                session_id: session_id,
                phase: session.phase || 'active',
                target_quality: session.target_quality,
                playlist_url: session.playlist_url || `/hls/${session_id}/instant.m3u8`,
                duration: session.duration || null,
                upgrade_available: session.phase === 'upgraded'
            });
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
        this.active_processes = new Map();

        this.hls_directory_cleanup();
        setInterval(() => this.hls_directory_cleanup(), Adaptive_Stream.hls_playlist_cleanup_interval); 
    }

    async stream(url, start_time = 0, target_quality = 'medium', initial_quality = 'ultra-low') {
        const session_id = Math.random().toString(36).substring(7);
        const session_directory = path.join(Adaptive_Stream.hls_root, session_id);
        
        // Ensure directory exists synchronously for immediate use
        if(!fs.ensureDirSync(session_directory)) throw new Error('Failed to create session directory');

        // Start all parallel operations immediately - don't wait for yt-dlp
        const [yt_dlp_process, master_playlist_path] = await Promise.all([
            this.create_yt_dlp_process(url),
            this.create_master_playlist(session_directory, initial_quality, target_quality) // Create master playlist immediately
        ]);

        // Create and start FFmpeg immediately after yt-dlp is ready
        const ffmpeg_process = await this.create_optimized_dual_quality_stream(
            yt_dlp_process, 
            start_time, 
            initial_quality, 
            target_quality, 
            session_directory
        );

        // Start FFmpeg process immediately
        ffmpeg_process.run();

        // Store session info immediately for cleanup
        this.active_processes.set(session_id, {
            ffmpeg: ffmpeg_process,
            yt_dlp: yt_dlp_process,
            url: url,
            session_directory: session_directory,
            target_quality: target_quality,
            initial_quality: initial_quality,
            start_time: Date.now()
        });

        // Wait for the fastest stream (low quality) to be ready in parallel
        const [low_playlist_ready, first_segment_ready] = await Promise.allSettled([
            this.wait_for_playlist(path.join(session_directory, 'low.m3u8')),
            this.wait_for_first_segment(session_directory, 'low')
        ]);

        // Check if either failed
        if (low_playlist_ready.status === 'rejected' && first_segment_ready.status === 'rejected') {
            throw new Error('Failed to create initial stream segments');
        }

        // Return immediately with the working stream
        return {
            success: true,
            playlist_url: `/hls/${session_id}/master.m3u8`,
            session_id: session_id,
            qualities: [initial_quality, target_quality],
            startup_mode: 'fast',
            ready_quality: initial_quality
        };
    }

    parse_duration(duration_str) {
        // Parse duration string in format "HH:MM:SS" or "MM:SS"
        const parts = duration_str.split(':').map(Number);
        if (parts.length === 3) {
            return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000; // HH:MM:SS
        } else if (parts.length === 2) {
            return (parts[0] * 60 + parts[1]) * 1000; // MM:SS
        } else {
            throw new Error('Invalid duration format');
        }
    }

    async create_master_playlist(session_directory, initial_quality, target_quality) {
        const initial_profile = Adaptive_Stream.profiles[initial_quality];
        const target_profile = Adaptive_Stream.profiles[target_quality];
        
        const master_content = `#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(initial_profile.bitrate) * 1000},CODECS="mp4a.40.2"
low.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(target_profile.bitrate) * 1000},CODECS="mp4a.40.2"
high.m3u8`;

        const master_path = path.join(session_directory, 'master.m3u8');
        fs.writeFileSync(master_path, master_content);
        return master_path;
    }

    async create_stream(yt_dlp_process, start_time = 0, quality = 'medium', session_directory, playlist_path) {
        if(!yt_dlp_process) throw new Error('yt-dlp process is required to create a stream');

        const profile = Adaptive_Stream.profiles[quality] || Adaptive_Stream.profiles['medium'];

        const ffmpeg_process = ffmpeg(yt_dlp_process.stdout)
            .audioCodec('aac')
            .audioBitrate(profile.bitrate)
            .audioChannels(profile.channels)
            .audioFrequency(profile.sample_rate)
            .format('hls')
            .outputOptions([
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
                '-hls_time 1', // Shorter segments = faster first segment
                '-hls_list_size 6', // Keep fewer segments in memory initially
                '-preset ultrafast', // Faster encoding
                '-tune zerolatency', // Optimize for low latency
                '-hls_flags append_list+omit_endlist', // Don't end list immediately
                '-hls_segment_filename', path.join(session_directory, 'stream%d.ts')
            ])
            .output(playlist_path);

        ffmpeg_process
            .on('start', () => {
                console.log(`FFmpeg started for session ${session_directory}`);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                throw new Error('FFmpeg streaming error: ' + err.message);
            })
            .on('end', () => {
                console.log(`FFmpeg ended for session ${session_directory}`);
            });

        return ffmpeg_process;
    }

    async create_dual_quality_stream(yt_dlp_process, start_time = 0, initial_quality = 'ultra-low', target_quality = 'medium', session_directory) {
        const initial_profile = Adaptive_Stream.profiles[initial_quality];
        const target_profile = Adaptive_Stream.profiles[target_quality];
        
        const ffmpeg_process = ffmpeg(yt_dlp_process.stdout)
            .seekInput(start_time)
            .complexFilter([
                '[0:a]asplit=2[low][high]'
            ])
            // Low quality stream (for fast startup)
            .output(path.join(session_directory, 'low.m3u8'))
            .audioCodec('aac')
            .audioBitrate(initial_profile.bitrate)
            .audioChannels(initial_profile.channels)
            .audioFrequency(initial_profile.sample_rate)
            .format('hls')
            .outputOptions([
                '-map', '[low]',
                '-hls_time', '1', // Shorter segments for faster startup
                '-hls_list_size', '0',
                '-hls_segment_filename', path.join(session_directory, 'low%d.ts')
            ])
            
            // High quality stream 
            .output(path.join(session_directory, 'high.m3u8'))
            .audioCodec('aac')
            .audioBitrate(target_profile.bitrate)
            .audioChannels(target_profile.channels)
            .audioFrequency(target_profile.sample_rate)
            .format('hls')
            .outputOptions([
                '-map', '[high]',
                '-hls_time', '2',
                '-hls_list_size', '0', 
                '-hls_segment_filename', path.join(session_directory, 'high%d.ts')
            ]);
            
        return ffmpeg_process;
    }

    // Optimized dual quality stream with minimal startup time
    async create_optimized_dual_quality_stream(yt_dlp_process, start_time = 0, initial_quality = 'ultra-low', target_quality = 'medium', session_directory) {
        const initial_profile = Adaptive_Stream.profiles[initial_quality];
        const target_profile = Adaptive_Stream.profiles[target_quality];
        
        const ffmpeg_process = ffmpeg(yt_dlp_process.stdout)
            .seekInput(start_time)
            .complexFilter([
                '[0:a]asplit=2[low][high]'
            ])
            // Ultra-fast low quality stream (prioritized for immediate startup)
            .output(path.join(session_directory, 'low.m3u8'))
            .audioCodec('aac')
            .audioBitrate(initial_profile.bitrate)
            .audioChannels(initial_profile.channels)
            .audioFrequency(initial_profile.sample_rate)
            .format('hls')
            .outputOptions([
                '-map', '[low]',
                '-hls_time', '0.5',
                '-hls_list_size', '0',
                '-hls_segment_type', 'mpegts',           // ✅ Better compatibility
                '-start_number', '0',                    // ✅ Start from segment 0
                '-avoid_negative_ts', 'make_zero',       // ✅ Already there, good
                '-fflags', '+genpts',                    // ✅ Already there, good
                '-map_metadata', '-1',                   // ✅ Remove metadata for speed
                '-reset_timestamps', '1',                // ✅ Already there, good
                '-hls_allow_cache', '1',                 // ✅ Allow caching
                '-preset', 'ultrafast',                  // ✅ Already there
                '-tune', 'zerolatency',                  // ✅ Already there
                '-hls_flags', 'append_list+omit_endlist', // ✅ Already there
                '-hls_segment_filename', path.join(session_directory, 'low%d.ts')
            ])
            
            // High quality stream (starts after low quality is established)
            .output(path.join(session_directory, 'high.m3u8'))
            .audioCodec('aac')
            .audioBitrate(target_profile.bitrate)
            .audioChannels(target_profile.channels)
            .audioFrequency(target_profile.sample_rate)
            .format('hls')
            .outputOptions([
                '-map', '[high]',
                '-hls_time', '2', // Normal segments for quality
                '-hls_list_size', '0',
                '-preset', 'fast', // Balance between speed and quality
                '-avoid_negative_ts', 'make_zero',
                '-fflags', '+genpts',
                '-reset_timestamps', '1',
                '-hls_flags', 'append_list+omit_endlist',
                '-hls_segment_filename', path.join(session_directory, 'high%d.ts')
            ]);
            
        return ffmpeg_process;
    }



    async create_yt_dlp_process(url) {
        const process = spawn('yt-dlp', [
            '-f', 'bestaudio[ext=m4a]/bestaudio/best',
            '--no-playlist',
            '--quiet',
            '--no-warnings',
            '--buffer-size', Adaptive_Stream.stream_buffer_size,
            '--no-part',
            '--socket-timeout', '10', // Faster timeout
            '--fragment-retries', '3', // Fewer retries for speed
            '--retries', '2', // Fewer retries for speed
            '-o', '-',
            url
        ]);
        
        process.on('error', (err) => {
            console.error('yt-dlp error:', err);
            throw new Error('Failed to start yt-dlp process: ' + err.message);
        });
        
        return process;
    }

    wait_for_playlist(playlist_path) {
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


        // Wait for at least the first segment to be created
    wait_for_first_segment(session_directory, quality = 'low') {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout waiting for first segment')), Adaptive_Stream.hls_playlist_segment_wait_timeout);
            
            const check = () => {
                const segment_path = path.join(session_directory, `${quality}0.ts`);
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
                const age = now - session.start_time;
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

    get_duration(url) {
        // Get the duration of the video using yt-dlp
        if (!url) return Promise.reject(new Error('URL is required to get duration'));

        return new Promise((resolve, reject) => {
            const yt_dlp = spawn('yt-dlp', [
                '--get-duration',
                '--no-playlist',
                '--quiet',
                url
            ]);
            
            let duration = '';
            yt_dlp.stdout.on('data', (data) => {
                duration += data.toString();
            });
            
            yt_dlp.on('close', (code) => {
                if (code === 0) {
                    resolve(duration.trim());
                } else {
                    resolve('00:00'); // Default duration if yt-dlp fails
                }
            });
        });
    }

    // Ultra-fast startup stream - sacrifices quality for speed
    // async create_instant_startup_stream(url, start_time = 0, session_directory) {
    //     const session_id = Math.random().toString(36).substring(7);
        
    //     // Create bare minimum ultra-low quality stream for instant playback
    //     const yt_dlp_process = spawn('yt-dlp', [
    //         '-f', 'worst[abr<=32]/worstaudio',  // Absolutely lowest quality
    //         '--no-playlist',
    //         '--quiet',
    //         '--no-warnings',
    //         '--socket-timeout', '5',
    //         '--fragment-retries', '1',
    //         '--retries', '1',
    //         '-o', '-',
    //         url
    //     ]);

    //     const instant_profile = Adaptive_Stream.profiles['ultra-low'];
        
    //     const ffmpeg_process = ffmpeg(yt_dlp_process.stdout)
    //         .seekInput(start_time)
    //         .audioCodec('aac')
    //         .audioBitrate('24k') // Even lower than ultra-low
    //         .audioChannels(1)
    //         .audioFrequency(22050)
    //         .format('hls')
    //         .outputOptions([
    //             '-hls_time', '0.25', // Extremely short segments
    //             '-hls_list_size', '0',
    //             '-preset', 'ultrafast',
    //             '-tune', 'zerolatency',
    //             '-avoid_negative_ts', 'make_zero',
    //             '-fflags', '+genpts+flush_packets',
    //             '-reset_timestamps', '1',
    //             '-hls_flags', 'append_list+omit_endlist+program_date_time',
    //             '-hls_segment_filename', path.join(session_directory, 'instant%d.ts')
    //         ])
    //         .output(path.join(session_directory, 'instant.m3u8'));

    //     return { ffmpeg_process, yt_dlp_process };
    // }
}

export default Adaptive_Stream;