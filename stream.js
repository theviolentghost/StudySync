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
    static hls_playlist_refresh_interval = 100; // Interval to check for playlist in ms
    static hls_playlist_segment_wait_timeout = 15000; // Max wait time for first segment in ms
    static hls_playlist_segment_interval = 50; // Interval to check for first segment in ms

    static hls_playlist_max_uphold_time = 1000 * 60 * 60; // 1 hour
    static hls_playlist_cleanup_interval = 10 * 60 * 1000; // 10 min

    static hls_playlist_generation_timeout = 26000; // 26 seconds

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

        app.get('/stream/preload', async (req, res) => {
            const video_id = req.query.video_id;
            const start_time = parseInt(req.query.t || '0', 10) || 0;
            const target_quality = req.query.quality || 'medium';
            const initial_quality = req.query.initial_quality || 'ultra-low';
            const duration_seconds = parseInt(req.query.duration || '5', 10) || 8;
            // force duration_seconds to 3-20 seconds
            if (duration_seconds < 3 || duration_seconds > 20) {
                return res.status(400).send('Invalid duration, must be between 3 and 20 seconds');
            }

            if (!video_id) return res.status(400).send('Missing video_id');

            const video_url = `https://www.youtube.com/watch?v=${video_id}`;

            try {
                const response = await this.preload(video_url, start_time, target_quality, initial_quality, duration_seconds);
                res.json(response);
            } catch (error) {
                console.error('Preload error:', error);
                res.status(500).send('Error: ' + error.message);
            }
        });

        app.get('/stream/upgrade', async (req, res) => {
            // const { session_id } = req.body;
            const session_id = req.query.session_id;
            if (!session_id) return res.status(400).send('Missing session_id');

            try {
                const response = await this.upgrade_preload(session_id);
                res.json(response);
            } catch (error) {
                console.error('Upgrade error:', error);
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
        console.time('dir check');
        const session_id = Math.random().toString(36).substring(7);
        const session_directory = path.join(Adaptive_Stream.hls_root, session_id);
        
        // Ensure directory exists synchronously for immediate use
        if(!fs.ensureDirSync(session_directory)) throw new Error('Failed to create session directory');

        console.timeEnd('dir check');
        console.time('yt-dlp process');

        // Start all parallel operations immediately - don't wait for yt-dlp
        const [yt_dlp_process, master_playlist_path] = await Promise.all([
            this.create_yt_dlp_process(url),
            this.create_master_playlist(session_directory, initial_quality, target_quality) // Create master playlist immediately
        ]);
        console.timeEnd('yt-dlp process');
        console.time('ffmpeg process');

        // Create and start FFmpeg immediately after yt-dlp is ready
        const ffmpeg_process = await this.create_dual_quality_stream(
            yt_dlp_process, 
            start_time, 
            initial_quality, 
            target_quality, 
            session_directory
        );

        // Start FFmpeg process immediately
        ffmpeg_process.run();
        console.timeEnd('ffmpeg process');
        console.time('playlist ready');

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

        // Wait for both the playlist and first segment to be ready
        try {
            await Promise.race([
                Promise.all([
                    this.wait_for_playlist(path.join(session_directory, 'low.m3u8')),
                    this.wait_for_first_segment(session_directory, 'low')
                ]),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for low quality stream')), Adaptive_Stream.hls_playlist_generation_timeout))
            ]);
        } catch (error) {
            console.error('Failed to wait for low quality stream:', error);
            throw new Error('Failed to initialize low quality stream: ' + error.message);
        }

        // console.log('Session directory contents:', fs.readdirSync(session_directory));
        console.timeEnd('playlist ready');

        // Return only after low.m3u8 is guaranteed to exist
        return {
            success: true,
            playlist_url: `/hls/${session_id}/master.m3u8`,
            session_id: session_id,
            qualities: [initial_quality, target_quality],
            startup_mode: 'instant',
            ready_quality: initial_quality
        };
    }

    async preload(url, start_time = 0, target_quality = 'medium', initial_quality = 'ultra-low', duration_seconds = 8) {
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
        const ffmpeg_process = await this.create_dual_quality_preload_stream(
            yt_dlp_process, 
            start_time, 
            initial_quality, 
            target_quality, 
            session_directory,
            duration_seconds,
            session_id
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
            start_time: Date.now(),
            phase: 'preload'
        });

        // Wait for both the playlist and first segment to be ready
        try {
            await Promise.race([
                Promise.all([
                    this.wait_for_playlist(path.join(session_directory, 'low.m3u8')),
                    this.wait_for_playlist(path.join(session_directory, 'high.m3u8')),
                    this.wait_for_first_segment(session_directory, 'low')
                ]),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for low quality stream')), Adaptive_Stream.hls_playlist_generation_timeout))
            ]);
        } catch (error) {
            console.error('Failed to wait for low quality stream:', error);
            throw new Error('Failed to initialize low quality stream: ' + error.message);
        }

        this.remove_discontinuity_tags(session_directory);

        // Return only after low.m3u8 is guaranteed to exist
        console.log('preloaded session', session_id, 'with duration', duration_seconds, 'seconds');
        return {
            success: true,
            playlist_url: `/hls/${session_id}/master.m3u8`,
            session_id: session_id,
            qualities: [initial_quality, target_quality],
            startup_mode: 'preload',
            ready_quality: initial_quality,
            duration: duration_seconds,
        };
    }

    async upgrade_preload(session_id) {
        const session = this.active_processes.get(session_id);
        if (!session) {
            throw new Error('Session not found');
        }
        if (session.phase !== 'preload') {
            throw new Error('Session is not in preload phase');
        }
        // Transition to active streaming phase
        session.phase = 'upgrading';

        const yt_dlp_process = await this.create_yt_dlp_process(session.url);
        // this.reopen_playlists_for_continuation(session.session_directory);

        // create new ffmpeg process that continues streaming from duration spot
        const continuation_ffmpeg = await this.create_continuation_stream(
            yt_dlp_process, 
            0, // start_time is ignored in continuation
            session.initial_quality, 
            session.target_quality, 
            session.session_directory,
            session.duration || 8
        );

        // Start the continuation FFmpeg process
        continuation_ffmpeg.run();

        // Replace the old ffmpeg process with the new one for cleanup
        session.ffmpeg = continuation_ffmpeg;
        session.phase = 'upgraded';

        console.log(`Upgraded session ${session_id} to active streaming phase`);

        return { success: true, session_id: session_id, playlist_url: `/hls/${session_id}/master.m3u8`, phase: 'upgraded' };
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
                '-hls_flags append_list',
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
                '-hls_time', '1.0',                      
                '-hls_list_size', '0',
                '-hls_segment_type', 'mpegts',
                '-start_number', '0',
                '-avoid_negative_ts', 'make_zero',
                '-fflags', '+genpts+flush_packets',      
                '-map_metadata', '-1',
                // '-reset_timestamps', '1',
                // '-hls_allow_cache', '1',
                '-preset', 'ultrafast',
                '-tune', 'zerolatency',
                // '-threads', '1',  // ✅ Use single thread for faster startup
                '-hls_flags', 'append_list',
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
                '-hls_time', '2.0',
                '-hls_list_size', '0',
                '-preset', 'fast',
                '-avoid_negative_ts', 'make_zero',
                '-fflags', '+genpts',
                // '-reset_timestamps', '1',
                '-hls_flags', 'append_list',
                '-hls_segment_filename', path.join(session_directory, 'high%d.ts')
            ]);
            
        return ffmpeg_process;
    }

    async create_dual_quality_preload_stream(yt_dlp_process, start_time = 0, initial_quality = 'ultra-low', target_quality = 'medium', session_directory, duration_seconds = 5, session_id) {
        const initial_profile = Adaptive_Stream.profiles[initial_quality];
        const target_profile = Adaptive_Stream.profiles[target_quality];
        
        const ffmpeg_process = ffmpeg(yt_dlp_process.stdout)
            .seekInput(start_time)
            .complexFilter(['[0:a]asplit=2[low][high]'])
            
            // Ultra-fast low quality stream for instant startup
            .output(path.join(session_directory, 'low.m3u8'))
            .duration(duration_seconds + 1) // +1 to ensure we get full segments
            .audioCodec('aac')
            .audioBitrate(initial_profile.bitrate)
            .audioChannels(initial_profile.channels)
            .audioFrequency(initial_profile.sample_rate)
            .format('hls')
            .outputOptions([
                '-map', '[low]',
                '-hls_time', '1',                      // Tiny segments
                '-hls_list_size', '0',
                '-hls_segment_type', 'mpegts',
                '-start_number', '0',
                '-avoid_negative_ts', 'make_zero',
                '-fflags', '+genpts+flush_packets',
                '-map_metadata', '-1',
                // '-reset_timestamps', '1',
                '-preset', 'ultrafast',
                '-tune', 'zerolatency',
                '-threads', '1',
                '-hls_flags', 'append_list+omit_endlist', // Don't end the list yet
                '-hls_segment_filename', path.join(session_directory, 'low%d.ts')
            ])
            
            // High quality preload (also limited)
            .output(path.join(session_directory, 'high.m3u8'))
            .duration(duration_seconds)
            .audioCodec('aac')
            .audioBitrate(target_profile.bitrate)
            .audioChannels(target_profile.channels)
            .audioFrequency(target_profile.sample_rate)
            .format('hls')
            .outputOptions([
                '-map', '[high]',
                '-hls_time', '1',
                '-hls_list_size', '0',
                '-preset', 'fast',
                '-avoid_negative_ts', 'make_zero',
                '-fflags', '+genpts',
                // '-reset_timestamps', '1',
                '-hls_flags', 'append_list+omit_endlist', // Don't end the list yet
                '-hls_segment_filename', path.join(session_directory, 'high%d.ts')
            ]);
            
        // Monitor when preload is complete
        ffmpeg_process.on('end', () => {
            const session = this.active_processes.get(session_id);
            if (session) {
                session.preload_complete = true;
                // this.reopen_playlists_for_continuation(session.session_directory);
                console.log(`Preload complete for session ${session_id}`);
            }
        });
            
        return ffmpeg_process;
    }

    async remove_discontinuity_tags(session_directory) {
        const playlists = ['low.m3u8', 'high.m3u8'];
        const maxWaitTime = 10000; // 10 seconds
        const checkInterval = 200; // Check every 200ms
        
        for (const playlist of playlists) {
            const playlistPath = path.join(session_directory, playlist);
            console.log(`Checking for discontinuity tags in: ${playlistPath}`);
            
            try {
                // Wait for file to exist
                const startTime = Date.now();
                while (!fs.existsSync(playlistPath)) {
                    const elapsed = Date.now() - startTime;
                    if (elapsed >= maxWaitTime) {
                        console.log(`⚠️ Timeout waiting for ${playlist} - skipping discontinuity removal`);
                        continue; // Skip this playlist and try the next one
                    }
                    
                    // Wait before checking again
                    await new Promise(resolve => setTimeout(resolve, checkInterval));
                }
                
                // File exists, now process it
                let content = fs.readFileSync(playlistPath, 'utf8');
                const originalContent = content;
                
                // Remove all discontinuity tags
                content = content.replace(/#EXT-X-DISCONTINUITY\n/g, '');
                content = content.replace(/#EXT-X-DISCONTINUITY/g, '');
                
                // Only write if content changed
                if (content !== originalContent) {
                    setTimeout(() => {fs.writeFileSync(playlistPath, content); },500); // Delay to ensure file is not being read
                } else {
                    console.warn(`ℹ️ No discontinuity tags found in: ${playlist}`);
                }
                
            } catch (error) {
                console.error(`Error processing ${playlist}:`, error.message);
            }
        }
    }

    async create_continuation_stream(yt_dlp_process, start_time = 0, initial_quality = 'ultra-low', target_quality = 'medium', session_directory, preload_duration = 5) {
        if(!yt_dlp_process) throw new Error('yt-dlp process is required to create a continuation stream');

        const initial_profile = Adaptive_Stream.profiles[initial_quality];
        const target_profile = Adaptive_Stream.profiles[target_quality];
        
        // Calculate next segment numbers by reading existing segments
        const files = fs.readdirSync(session_directory);
        const lowSegments = files.filter(f => f.startsWith('low') && f.endsWith('.ts'))
            .map(f => parseInt(f.match(/\d+/)?.[0] || '0'))
            .filter(n => !isNaN(n));
        const highSegments = files.filter(f => f.startsWith('high') && f.endsWith('.ts'))
            .map(f => parseInt(f.match(/\d+/)?.[0] || '0'))
            .filter(n => !isNaN(n));
        
        const nextLowSegment = lowSegments.length > 0 ? Math.max(...lowSegments) + 1 : 0;
        const nextHighSegment = highSegments.length > 0 ? Math.max(...highSegments) + 1 : 0;
        
        console.log(`Continuing from segment numbers: low=${nextLowSegment}, high=${nextHighSegment}`);
        
        const ffmpeg_process = ffmpeg(yt_dlp_process.stdout)
            .seekInput(preload_duration) // ✅ Seek to where preload ended
            .complexFilter(['[0:a]asplit=2[low][high]'])
            
            // Continue low quality stream
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
                '-hls_segment_type', 'mpegts',
                // '-start_number', nextLowSegment.toString(), // ✅ Continue numbering
                '-avoid_negative_ts', 'make_zero',
                '-fflags', '+genpts+flush_packets',
                '-map_metadata', '-1',
                '-reset_timestamps', '1',
                '-preset', 'ultrafast',
                '-tune', 'zerolatency',
                '-threads', '1',
                '-hls_flags', 'append_list', // ✅ Append to existing playlist
                '-hls_segment_filename', path.join(session_directory, 'low%d.ts')
            ])
            
            // Continue high quality stream
            .output(path.join(session_directory, 'high.m3u8'))
            .audioCodec('aac')
            .audioBitrate(target_profile.bitrate)
            .audioChannels(target_profile.channels)
            .audioFrequency(target_profile.sample_rate)
            .format('hls')
            .outputOptions([
                '-map', '[high]',
                '-hls_time', '1',
                '-hls_list_size', '0',
                // '-start_number', nextHighSegment.toString(), // ✅ Continue numbering
                '-preset', 'fast',
                '-avoid_negative_ts', 'make_zero',
                '-fflags', '+genpts',
                '-reset_timestamps', '1',
                '-hls_flags', 'append_list', // ✅ Append to existing playlist
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

    wait_for_minimal_playlist(playlist_path) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 2000); // Only 2 second max
            
            const check = () => {
                if (fs.existsSync(playlist_path)) {
                    try {
                        const content = fs.readFileSync(playlist_path, 'utf8');
                        // Just check if it has basic M3U structure - don't wait for segments
                        if (content.includes('#EXTM3U') && content.length > 50) {
                            clearTimeout(timeout);
                            resolve();
                            return;
                        }
                    } catch (e) {
                        // File exists but not readable yet
                    }
                }
                setTimeout(check, 50); // Check every 50ms instead of 200ms
            };
            check();
        });
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
}

export default Adaptive_Stream;