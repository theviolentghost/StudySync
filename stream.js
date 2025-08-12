import express from 'express';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';

const __dirname = path.resolve();

class Adaptive_Stream {
    static profiles = {
        'desperate': { 
            bitrate: '16k',
            sample_rate: 22050,
            channels: 1,
            audio_profile: 'aac_he',
            bandwidth: 16 * 1024,
            codec: 'mp4a.40.2',
            hls_time: '1.0', // Short segments for fast startup
            hls_preset: 'ultrafast',
        },
        'ultra-low': { 
            bitrate: '32k',
            sample_rate: 22050,
            channels: 1,
            audio_profile: 'aac_he',
            bandwidth: 32 * 1024,
            codec: 'mp4a.40.2',
            hls_time: '1.0', // Short segments for fast startup
            hls_preset: 'ultrafast',
        },
        'low': { 
            bitrate: '64k',
            sample_rate: 44100, 
            channels: 1, 
            audio_profile: 'aac_he',
            bandwidth: 64 * 1024 ,
            codec: 'mp4a.40.2',
            hls_time: '1.0', // Short segments for fast startup
            hls_preset: 'ultrafast',
        },
        'medium': { 
            bitrate: '128k',
            sample_rate: 44100,
            channels: 2,
            audio_profile: 'aac_low',
            bandwidth: 128 * 1024,
            codec: 'mp4a.40.2',
            hls_time: '2.0',
            hls_preset: 'fast',
        },
        'high': { 
            bitrate: '192k',
            sample_rate: 44100,
            channels: 2,
            audio_profile: 'aac_low',
            bandwidth: 192 * 1024,
            codec: 'mp4a.40.2',
            hls_time: '4.0',
            hls_preset: 'medium',
        },
        'ultra-high': { 
            bitrate: '256k',
            sample_rate: 44100,
            channels: 2,
            audio_profile: 'aac_low',
            bandwidth: 256 * 1024,
            codec: 'mp4a.40.2',
            hls_time: '4.0',
            hls_preset: 'medium',
        }
    };
    static profile_progression = ['ultra-low', 'low', 'medium', 'high', 'ultra-high']; // Order of profiles for adaptive streaming
    get_requested_profiles(target_profile = 'medium') {
        const target_index = Adaptive_Stream.profile_progression.indexOf(target_profile);
        if (target_index === -1) return [];

        // Get all profiles from ultra-low to the target profile
        return Adaptive_Stream.profile_progression.slice(0, target_index + 1);
    }
    static hls_root = path.join(__dirname, 'hls');
    static stream_buffer_size = '16K'; // Buffer size for streaming

    static hls_playlist_max_timeout = 30000; // Max wait time for playlist in ms
    static hls_playlist_refresh_interval = 100; // Interval to check for playlist in ms
    static hls_playlist_segment_wait_timeout = 15000; // Max wait time for first segment in ms
    static hls_playlist_segment_interval = 50; // Interval to check for first segment in ms

    static hls_playlist_max_uphold_time = 15 * 60 * 1000; // 15 min (can be kept alive to last longer)
    static hls_playlist_cleanup_interval = 5 * 60 * 1000; // 5 min

    static hls_playlist_generation_timeout = 26000; // 26 seconds

    setup_endpoints(app) {
        // Configure static middleware with proper MIME types for HLS
        app.use('/hls', express.static(Adaptive_Stream.hls_root, {
            setHeaders: (res, path) => {
                if (path.endsWith('.m3u8')) {
                    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Headers', 'Range');
                    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
                } else if (path.endsWith('.ts')) {
                    res.setHeader('Content-Type', 'video/mp2t');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Headers', 'Range');
                    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
                }
            }
        }));

        // Standard adaptive quality stream
        app.get('/stream', async (req, res) => {
            const video_id = req.query.video_id;
            const target_quality = req.query.quality || 'medium';

            if (!video_id) return res.status(400).send('Missing video_id');

            try {
                // console.log('stream:', video_id);
                const response = await this.stream(video_id, target_quality);
                res.json(response);
            } catch (error) {
                console.error('Streaming error:', error.message);
                res.status(500).json({ error: 'Error generating stream', success: false });
            }
        });

        app.get('/stream/preload', async (req, res) => {
            const video_id = req.query.video_id;
            const target_quality = req.query.quality || 'medium';

            if (!video_id) return res.status(400).send('Missing video_id');

            try {
                // console.log(`Preloading stream for video ID: ${video_id} with target quality: ${target_quality}`);
                const response = await this.preload(video_id, target_quality);
                res.json(response);
            } catch (error) {
                console.error('Preload error:', error.message);
                res.status(500).json({ error: 'Error generating preload stream', success: false });
            }
        });

        app.get('stream/keepalive', async (req, res) => {
            const video_id = req.query.video_id;
            const target_quality = req.query.quality || 'medium';
            // to implement
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
        // app.get('/session/:session_id/status', (req, res) => {
        //     const session_id = req.params.session_id;
        //     const session = this.active_processes.get(session_id);
            
        //     if (!session) {
        //         return res.status(404).json({ error: 'Session not found' });
        //     }

        //     res.json({
        //         session_id: session_id,
        //         phase: session.phase || 'active',
        //         target_quality: session.target_quality,
        //         playlist_url: session.playlist_url || `/hls/${session_id}/instant.m3u8`,
        //         duration: session.duration || null,
        //         upgrade_available: session.phase === 'upgraded'
        //     });
        // });

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

    does_session_already_exist(session_id, target_quality) {
        const session = this.active_processes.get(session_id);
        if (!session) return false;

        // Check if the session has the requested quality
        const requested_profiles = this.get_requested_profiles(target_quality);
        return requested_profiles.some(profile => 
            session.qualities.includes(profile) && 
            fs.existsSync(path.join(session.session_directory, `${Adaptive_Stream.profiles[profile].bitrate}.m3u8`))
        );
    }

    async stream(video_id, target_quality = 'medium', fast_startup = true) {
        // console.time('dir check');
        const session_id = video_id;
        const url = `https://www.youtube.com/watch?v=${video_id}`;
        const session_directory = path.join(Adaptive_Stream.hls_root, session_id);
        let requested_profiles = this.get_requested_profiles(target_quality);

        // console.log(`Starting stream for video ID: ${video_id} with target quality: ${target_quality}`);

        // Check if session already exists
        // if so return existing session info if it contains the requested quality
        if( this.does_session_already_exist(session_id, target_quality) ) {
            const session = this.active_processes.get(session_id);
            if (!session) throw new Error(`Session ${session_id} not found`);
            session.start_time = Date.now(); 
            return {
                success: true,
                playlist_url: `/hls/${session_id}/master.m3u8`,
                session_id: session_id,
                qualities: this.get_requested_profiles(target_quality),
                startup_mode: fast_startup ? 'instant' : 'delayed',
                origin: 'existing'
            };
        }

        // if session with required quakity does not exist
        // check to see if a session with the same ID exists
        // if so, add the desired quality to the existing session
        if( this.active_processes.has(session_id) ) {
            const existing_session = this.active_processes.get(session_id);
            const missing_profiles = requested_profiles.filter(profile => !existing_session.qualities.includes(profile));
            if (missing_profiles.length === 0) {
                // make sure existing session has the minimum quality, if not wait.
                try {
                    await Promise.race([
                        Promise.all([
                            this.wait_for_playlist(path.join(session_directory, `${Adaptive_Stream.profiles[Adaptive_Stream.profile_progression[0]].bitrate}.m3u8`)),
                            this.wait_for_first_segment(session_directory, Adaptive_Stream.profiles[Adaptive_Stream.profile_progression[0]].bitrate),
                        ]),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for low quality stream')), Adaptive_Stream.hls_playlist_generation_timeout))
                    ]);
                } catch (error) {
                    console.error('Failed to wait for low quality stream:', error);
                    throw new Error('Failed to initialize low quality stream: ' + error.message);
                }


                return {
                    success: true,
                    playlist_url: `/hls/${session_id}/master.m3u8`,
                    session_id: session_id,
                    qualities: this.get_requested_profiles(target_quality),
                    startup_mode: fast_startup ? 'instant' : 'delayed',
                    origin: 'existing#missing'
                }
            }

            existing_session.start_time = Date.now(); 
            requested_profiles = missing_profiles; // Update requested profiles to only include missing ones
        }
        // Ensure directory exists synchronously for immediate use
        else if(!fs.ensureDirSync(session_directory)) throw new Error(`Failed to create session directory: ${session_directory}`);

        // console.log('yt-dlp')
        const [yt_dlp_process] = await Promise.all([
            this.create_yt_dlp_process(url),
            this.create_master_playlist(session_directory, target_quality) // Create master playlist immediately
        ]);
        // console.log('yt-dlp process started');

        // Create and start FFmpeg immediately after yt-dlp is ready
        let ffmpeg_process;
        try {
            ffmpeg_process = await this.create_hls_stream(
                yt_dlp_process, 
                session_directory, 
                target_quality, // used as fallback
                fast_startup,
                requested_profiles,
            );

            // Start FFmpeg process immediately
            ffmpeg_process.run();
        } catch (error) {
            console.error('Failed to create HLS stream:', error);
            yt_dlp_process.kill('SIGTERM'); // Clean up yt-dlp process
            throw new Error('Failed to initialize HLS stream: ' + error.message);
        }
        // console.log('FFmpeg process started');

        // Store session info immediately for cleanup
        this.active_processes.set(session_id, {
            ffmpeg: ffmpeg_process,
            yt_dlp: yt_dlp_process,
            url: url,
            session_id: session_id,
            session_directory: session_directory,
            qualities: this.get_requested_profiles(target_quality),
            target_quality: target_quality,
            start_time: Date.now()
        });

        // Wait for both the playlist and first segment to be ready
        try {
            await Promise.race([
                Promise.all([
                    this.wait_for_playlist(path.join(session_directory, `${Adaptive_Stream.profiles[Adaptive_Stream.profile_progression[0]].bitrate}.m3u8`)),
                    this.wait_for_first_segment(session_directory, Adaptive_Stream.profiles[Adaptive_Stream.profile_progression[0]].bitrate),
                ]),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for low quality stream')), Adaptive_Stream.hls_playlist_generation_timeout))
            ]);
        } catch (error) {
            console.error('Failed to wait for low quality stream:', error);
            throw new Error('Failed to initialize low quality stream: ' + error.message);
        }

        // console.log(`Stream for video ID ${video_id} started successfully with target quality: ${target_quality}`);
        // console.log(path.join(session_directory, `${Adaptive_Stream.profiles[Adaptive_Stream.profile_progression[0]].bitrate}.m3u8`), 'exists')

        return {
            success: true,
            playlist_url: `/hls/${session_id}/master.m3u8`,
            session_id: session_id,
            qualities: this.get_requested_profiles(target_quality),
            startup_mode: fast_startup ? 'instant' : 'delayed',
            origin: 'new'
        };
    }

    async preload(video_id, target_quality = 'medium') {
        return this.stream(video_id, target_quality, false); // Start streaming without fast startup
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

    async create_master_playlist(session_directory, target_quality) {
        const profiles = this.get_requested_profiles(target_quality);
        if (profiles.length === 0) {
            throw new Error('No valid profiles found for target quality: ' + target_quality);
        }

        const master_lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
        for (const profile of profiles) {
            const profile_data = Adaptive_Stream.profiles[profile];
            if (!profile_data) {
                console.warn(`Profile ${profile} not found, skipping`);
                continue;
            }
            master_lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${profile_data.bandwidth},CODECS="${profile_data.codec}"`);
            master_lines.push(`${profile_data.bitrate}.m3u8`);
        }

        const master_path = path.join(session_directory, 'master.m3u8');
        fs.writeFileSync(master_path, master_lines.join('\n'));

        return master_path;
    }

    async create_hls_stream(yt_dlp_process, session_directory, target_quality = 'medium', fast_startup = false, requested_profiles) {
        const profiles = requested_profiles || this.get_requested_profiles(target_quality);
        if (profiles.length === 0) {
            throw new Error('No valid profiles found for target quality: ' + target_quality);
        }
        
        const ffmpeg_process = ffmpeg(yt_dlp_process.stdout);
        if (profiles.length > 1) {
            // split audio into multiple quality streams
            const split_outputs = profiles.map((profile) => `[${Adaptive_Stream.profiles[profile].bitrate}]`).join('');
            ffmpeg_process.complexFilter([
                `[0:a]asplit=${profiles.length}${split_outputs}`
            ]);
        }

        for(const profile of profiles) {
            const profile_data = Adaptive_Stream.profiles[profile];
            if (!profile_data) {
                console.warn(`Profile ${profile} not found, skipping`);
                continue;
            }

            ffmpeg_process
                .output(path.join(session_directory, `${profile_data.bitrate}.m3u8`))
                .audioCodec('aac')
                .audioBitrate(profile_data.bitrate)
                .audioChannels(profile_data.channels)
                .audioFrequency(profile_data.sample_rate)
                .format('hls')
                .outputOptions([
                     '-map', profiles.length > 1 ? `[${profile_data.bitrate}]` : '0:a',
                    '-hls_time', profile_data.hls_time || '2.0',
                    '-hls_list_size', '0',
                    // '-hls_segment_type', 'mpegts',
                    // '-start_number', '0',
                    // '-avoid_negative_ts', 'make_zero',
                    // '-fflags', '+genpts',
                    '-map_metadata', '-1',
                    '-preset', this.get_ffmpeg_tune(fast_startup, profile),
                    '-tune', this.get_ffmpeg_tune(fast_startup, profile),
                    // '-hls_flags', 'delete_segments',
                    '-hls_segment_filename', path.join(session_directory, `${profile_data.bitrate}_%d.ts`)
                ]);
        }
            
        return ffmpeg_process;
    }

    get_ffmpeg_tune(fast_startup, profile = 'ultra-low') {
        if(fast_startup) return 'zerolatency';
        return 'fastdecode'; // Default for other profiles
    }

    get_ffmpeg_tune(fast_startup, profile = 'ultra-low') {
        if(fast_startup) return 'ultrafast';
        return Adaptive_Stream.profiles[profile].hls_preset || 'fast';
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
                    try {
                        const content = fs.readFileSync(playlist_path, 'utf8');
                        // Check if playlist has actual content and at least one segment reference
                        if (content.includes('#EXTM3U') && content.includes('.ts')) {
                            clearTimeout(timeout);
                            resolve();
                            return;
                        }
                    } catch (e) {
                        // File exists but not readable/complete yet
                    }
                }
                setTimeout(check, Adaptive_Stream.hls_playlist_refresh_interval);
            };
            check();
        });
    };


        // Wait for at least the first segment to be created
    wait_for_first_segment(session_directory, quality = 'low') {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout waiting for first segment')), Adaptive_Stream.hls_playlist_segment_wait_timeout);
            
            const check = () => {
                const segment_path = path.join(session_directory, `${quality}_0.ts`);
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

    // async seek(session_id, time) {
    //     // to implement
    //     const session = this.active_processes.get(session_id);
    //     if (!session) {
    //         throw new Error('Session not found');
    //     }

    //     this.clean(session_id); // Clean up the session before seeking

    //     this.stream(session.url, time, session.quality);
    //     return {
    //         success: true,
    //         playlist_url: `/hls/${session_id}/stream.m3u8`,
    //         session_id: session_id
    //     };
    // }

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
}

export default Adaptive_Stream;