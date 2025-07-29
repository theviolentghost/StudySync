import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';


class Adaptive_Spotdl_Audio_Stream {
    static profiles = {
        'ultra-low': {
            bitrate: '32k',
            format: 'opus',
            ffmpeg_args: '-compression_level 10 -frame_duration 60'
        },
        'low': {
            bitrate: '64k',
            format: 'opus',
            ffmpeg_args: '-compression_level 8 -frame_duration 40'
        },
        'medium': {
            bitrate: '128k',
            format: 'mp3',
            ffmpeg_args: 'q:a 7'
        },
        'high': {
            bitrate: '192k',
            format: 'mp3',
            ffmpeg_args: 'q:a 4'
        },
        'ultra-high': {
            bitrate: '320k',
            format: 'mp3',
            ffmpeg_args: 'q:a 0'
        }
    }

    constructor(query, options = {}) {
        this.query = query;
        this.options = options;
        this.connection_analyzer = new Connection_Analyzer();
        this.download_process = null;
        this.ffmpeg_process = null;
        this.current_quality = options.initialQuality || 'medium';
        this.profile = Adaptive_Spotdl_Audio_Stream.profiles[this.current_quality];
        this.stream_start_time = null;
        this.bytes_streamed = 0;
        this.quality_check_interval = null;
    }

    start(res, seek_time = 0) {
        console.log('Starting stream for query:', this.query);
        this.stream_start_time = Date.now();
        
        this.download_process = spawn('yt-dlp', [
            this.query,
            '-f', 'bestaudio[ext=m4a]/bestaudio', 
            '--no-playlist',
            '--quiet',
            '--no-warnings',
            '-o', '-', 
        ]);

        this.download_process.stdout.once('readable', () => {
            console.log('yt-dlp download started, setting up ffmpeg pipeline');
            this.setup_ffmpeg_pipeline(res, seek_time);
            this.start_quality_monitoring(res);
        });

        // Handle yt-dlp errors
        this.download_process.stderr.on('data', (data) => {
            console.error('yt-dlp error:', data.toString());
        });

        this.download_process.on('error', (err) => {
            console.error('yt-dlp process error:', err);
            this.handle_error(res, err);
        });

        this.download_process.on('exit', (code) => {
            if (code !== 0) {
                console.error(`yt-dlp exited with code ${code}`);
                this.handle_error(res, new Error(`yt-dlp failed with code ${code}`));
            }
        });
    }

    setup_ffmpeg_pipeline(res, seek_time = 0) {
        this.ffmpeg_process = ffmpeg(this.download_process.stdout)
            .seekInput(seek_time)
            .audioCodec('libmp3lame')
            .audioBitrate(this.profile.bitrate || '128k')
            .format('mp3')
            .audioChannels(2)
            .audioFrequency(44100)
            .on('start', (commandLine) => {
                console.log('FFmpeg started:', commandLine);
                console.log(`Current quality: ${this.current_quality} (${this.profile.bitrate})`);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                if (!res.headersSent) {
                    this.handle_error(res, err);
                }
            })
            .on('end', () => {
                console.log('Stream ended');
                this.stop_quality_monitoring();
            })
            .on('progress', (progress) => {
                // Track bytes for speed calculation
                if (progress.targetSize) {
                    this.bytes_streamed = progress.targetSize * 1024; // Convert KB to bytes
                }
            });

        // Remove opus-specific options since we're forcing MP3
        // Don't add ffmpeg_args that might conflict with MP3

        this.ffmpeg_process.pipe(res, { end: true });
    }

    start_quality_monitoring(res) {
        console.log('Starting quality monitoring...');
        
        // Check quality every 5 seconds
        this.quality_check_interval = setInterval(() => {
            this.check_and_adjust_quality(res);
        }, 5000);
    }

    stop_quality_monitoring() {
        if (this.quality_check_interval) {
            clearInterval(this.quality_check_interval);
            this.quality_check_interval = null;
        }
    }

    check_and_adjust_quality(res) {
        if (!this.stream_start_time) return;

        // Calculate current speed
        const elapsed_time = (Date.now() - this.stream_start_time) / 1000; // seconds
        const current_speed = this.connection_analyzer.measure_speed(this.stream_start_time, this.bytes_streamed);
        
        console.log(`Current speed: ${current_speed.toFixed(2)} kbps, Bytes streamed: ${this.bytes_streamed}`);
        
        // Check if quality should change
        const quality_changed = this.connection_analyzer.set_quality_to_recommended();
        const recommended_quality = this.connection_analyzer.get_recommended_quality();
        
        if (quality_changed && recommended_quality !== this.current_quality) {
            console.log(`Quality change recommended: ${this.current_quality} -> ${recommended_quality}`);
            this.adjust_quality_on_the_fly(recommended_quality, res);
        }
    }

    adjust_quality_on_the_fly(new_quality, res) {
        // For live quality adjustment, we'd need to restart the FFmpeg process
        // This is a simplified version that logs the change
        console.log(`Adjusting quality from ${this.current_quality} to ${new_quality}`);
        
        this.current_quality = new_quality;
        this.profile = Adaptive_Spotdl_Audio_Stream.profiles[new_quality];
        
        // In a real implementation, you might:
        // 1. Restart the FFmpeg process with new settings
        // 2. Use multiple quality streams and switch between them
        // 3. Implement HLS adaptive streaming
        
        // For now, just log the change
        console.log(`New profile: ${this.profile.bitrate} bitrate`);
    }

    seek_to_time(time_in_seconds) {

    }

    handle_error(res, error) {
        console.error('Stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Streaming error', details: error.message });
        }
        this.cleanup();
    }
    cleanup() {
        this.stop_quality_monitoring();
        if (this.download_process) this.download_process.kill();
        if (this.ffmpeg_process) this.ffmpeg_process.kill();
    }
}

// Enhanced Connection Analyzer
class Connection_Analyzer {
    constructor() {
        this.speed_history = [];
        this.speed_history_length = 10;
        this.current_quality = 'medium';
        this.last_quality_change = 0; // Timestamp of last quality change
        this.quality_change_cooldown = 10000; // 10 seconds cooldown between changes
    }

    get speed() {
        if (this.speed_history.length === 0) return 0;
        return this.speed_history.reduce((a, b) => a + b, 0) / this.speed_history.length;
    }

    get average_speed() {
        return this.speed;
    }

    measure_speed(start_time, bytes_transferred) {
        const duration = (Date.now() - start_time) / 1000; // in seconds
        if (duration === 0) return 0; // Avoid division by zero
        
        const kbps = (bytes_transferred * 8) / (duration * 1000); // Convert to kbps
        
        this.speed_history.push(kbps);
        if (this.speed_history.length > this.speed_history_length) {
            this.speed_history.shift(); // Remove oldest entry
        }

        return this.average_speed;
    }

    set_quality_to_recommended() {
        const now = Date.now();
        
        // Don't change quality too frequently
        if (now - this.last_quality_change < this.quality_change_cooldown) {
            return false;
        }

        const recommended_quality = this.get_recommended_quality();
        if (recommended_quality !== this.current_quality) {
            this.current_quality = recommended_quality;
            this.last_quality_change = now;
            console.log(`Quality adjusted to: ${this.current_quality} (${this.average_speed.toFixed(2)} kbps)`);
            return true; // Quality changed
        }
        return false; // Quality remains the same
    }

    get_recommended_quality() {
        const effective_speed = this.speed; // Remove the division for more accurate measurement
        const buffer_factor = 1.5; // Keep some buffer for stability
 
        // More conservative thresholds
        if (effective_speed < 50 * buffer_factor) return 'ultra-low';  // < 75 kbps effective
        if (effective_speed < 100 * buffer_factor) return 'low';       // < 150 kbps effective
        if (effective_speed < 200 * buffer_factor) return 'medium';    // < 300 kbps effective
        if (effective_speed < 400 * buffer_factor) return 'high';      // < 600 kbps effective
        return 'ultra-high';                                           // >= 600 kbps effective
    }

    get_connection_info() {
        return {
            current_speed: this.average_speed,
            current_quality: this.current_quality,
            recommended_quality: this.get_recommended_quality(),
            speed_history: this.speed_history.slice(-5) // Last 5 measurements
        };
    }
}

import express from 'express';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
        <h1>Adaptive Spotdl Audio Stream</h1>
        <audio controls>
            <source src="/stream?query=https://music.youtube.com/watch?v=7wIHeJ78Axc" type="audio/mpeg">
            Your browser does not support the audio element.
        </audio>
    `);
});

app.get('/stream', async (req, res) => {
  const { query } = req.query;
  const seekTime = parseInt(req.query.t) || 0;
  const requestedQuality = req.query.quality || 'ultra-high';

  const format = 'mp3';
  res.set({
    'Content-Type': `audio/${format}`,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
    'Transfer-Encoding': 'chunked'
  });

  const streamer = new Adaptive_Spotdl_Audio_Stream(query, {
    initialQuality: requestedQuality
  });

  // Handle client disconnect
  req.on('close', () => {
    streamer.cleanup();
  });

  try {
    streamer.start(res, seekTime);
  } catch (error) {
    console.error('Streaming error:', error);
    streamer.cleanup();
  }
});

// Add endpoint to check connection status
app.get('/connection-info', (req, res) => {
  // This would need to be tied to a specific stream instance
  // For now, return a simple response
  res.json({
    message: 'Connection monitoring active',
    available_qualities: Object.keys(Adaptive_Spotdl_Audio_Stream.profiles)
  });
});

app.listen(8080, () => {
  console.log('Server is running on http://localhost:3000');
});