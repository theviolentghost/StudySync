import fs from 'fs/promises';
import { spawn } from 'child_process';

class AudioSyncPlayer {
    constructor(audioPath, timestampsPath) {
        this.audioPath = audioPath;
        this.timestampsPath = timestampsPath;
        this.wordTimestamps = [];
        this.currentWordIndex = 0;
        this.startTime = null;
        this.audioProcess = null;
        this.syncInterval = null;
    }

    async loadTimestamps() {
        try {
            const data = await fs.readFile(this.timestampsPath, 'utf8');
            const jsonData = JSON.parse(data);
            
            // Handle different JSON structures
            if (jsonData.aligned_words) {
                this.wordTimestamps = jsonData.aligned_words;
            } else if (jsonData.word_timestamps) {
                this.wordTimestamps = jsonData.word_timestamps;
            } else if (Array.isArray(jsonData)) {
                this.wordTimestamps = jsonData;
            } else {
                throw new Error('Could not find word timestamps in JSON file');
            }
            
            console.log(`📊 Loaded ${this.wordTimestamps.length} word timestamps`);
            return true;
        } catch (error) {
            console.error('❌ Error loading timestamps:', error.message);
            return false;
        }
    }

    async play() {
        console.log('🎵 Starting audio playback with synchronized lyrics...\n');
        
        // Start audio playback using system audio player
        this.startAudio();
        
        // Start timestamp tracking
        this.startTime = Date.now();
        this.currentWordIndex = 0;
        
        // Update lyrics every 50ms for smooth sync
        this.syncInterval = setInterval(() => {
            this.updateCurrentWord();
        }, 50);

        // Show initial controls
        // this.showControls();
    }

    startAudio() {
        try {
            // Use macOS 'afplay' command to play audio
            this.audioProcess = spawn('afplay', [this.audioPath], {
                stdio: 'pipe'
            });

            this.audioProcess.on('close', (code) => {
                console.log('\n🎵 Audio playback finished');
                this.stop();
            });

            this.audioProcess.on('error', (err) => {
                console.error('❌ Audio playback error:', err.message);
                console.log('💡 Tip: Make sure the audio file exists and is playable');
            });

        } catch (error) {
            console.error('❌ Failed to start audio:', error.message);
        }
    }

    updateCurrentWord() {
        if (!this.startTime || this.currentWordIndex >= this.wordTimestamps.length) {
            return;
        }

        const currentTime = (Date.now() - this.startTime) / 1000; // Convert to seconds
        const currentWord = this.wordTimestamps[this.currentWordIndex];

        // Check if we should advance to the next word
        if (currentWord && currentTime >= currentWord.start) {
            this.displayCurrentWord(currentWord, currentTime);
            this.currentWordIndex++;
        }
    }

    displayCurrentWord(word, currentTime) {
        // Clear the previous line and show current word
        process.stdout.write('\r\x1b[K'); // Clear line
        
        const timeDisplay = `[${currentTime.toFixed(1)}s]`;
        const wordDisplay = `"${word.word}"`;
        const sourceInfo = word.source ? ` (${word.source})` : '';
        const probInfo = word.probability ? ` ${(word.probability * 100).toFixed(0)}%` : '';
        
        // Color code based on source/confidence
        let color = '\x1b[37m'; // White (default)
        if (word.source === 'transcription_aligned') {
            color = '\x1b[32m'; // Green (high confidence)
        } else if (word.source === 'lyrics_estimated') {
            color = '\x1b[33m'; // Yellow (estimated)
        } else if (word.source === 'lyrics_extrapolated') {
            color = '\x1b[36m'; // Cyan (extrapolated)
        }

        console.log(`\n\n${color}🎤 ${timeDisplay} ${wordDisplay}${probInfo}${sourceInfo}\x1b[0m`);
        
        // process.stdout.write(
        //     `${color}🎤 ${timeDisplay} ${wordDisplay}${probInfo}${sourceInfo}\x1b[0m`
        // );
    }

    showControls() {
        console.log('🎮 Controls:');
        console.log('   Press Ctrl+C to stop');
        console.log('   Press Space to pause/resume (if supported)');
        console.log('─'.repeat(50));
        
        // Listen for keyboard input
        // process.stdin.setRawMode(true);
        // process.stdin.resume();
        // process.stdin.on('data', (key) => {
        //     if (key[0] === 3) { // Ctrl+C
        //         this.stop();
        //         process.exit(0);
        //     }
        // });
    }

    stop() {
        console.log('\n\n🛑 Stopping audio sync player...');
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        if (this.audioProcess) {
            this.audioProcess.kill('SIGTERM');
            this.audioProcess = null;
        }
        
        process.stdin.setRawMode(false);
        process.stdin.pause();
    }

    // Test function to show upcoming words without audio
    async testSync() {
        console.log('🧪 Testing sync without audio (showing first 20 words)...\n');
        
        for (let i = 0; i < Math.min(20, this.wordTimestamps.length); i++) {
            const word = this.wordTimestamps[i];
            const timeDisplay = `[${word.start.toFixed(1)}s - ${word.end.toFixed(1)}s]`;
            const sourceInfo = word.source ? ` (${word.source})` : '';
            
            console.log(i,timeDisplay,word.word,sourceInfo);
            
            // Simulate timing
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('\n✅ Sync test complete!');
    }

    // Function to jump to a specific time
    jumpToTime(seconds) {
        if (!this.startTime) {
            console.log('❌ Player not started');
            return;
        }

        // Find the word at this time
        const targetWord = this.wordTimestamps.find(word => 
            seconds >= word.start && seconds <= word.end
        );

        if (targetWord) {
            this.currentWordIndex = this.wordTimestamps.indexOf(targetWord);
            this.startTime = Date.now() - (seconds * 1000);
            
        } else {
            
        }
    }
}

// Test function
async function testAudioSync() {
    const audioPath = '/Users/norbertzych/Desktop/Projects/study_sinc/rick.mp3';
    const timestampsPath = '/Users/norbertzych/Desktop/Projects/study_sinc/enhanced_word_timestamps.json';
    
    console.log('🚀 Audio Sync Player Test');
    console.log('========================\n');
    
    const player = new AudioSyncPlayer(audioPath, timestampsPath);
    
    // Load timestamps
    const loaded = await player.loadTimestamps();
    if (!loaded) {
        console.log('❌ Failed to load timestamps');
        return;
    }
    
    // Show options
    console.log('Choose an option:');
    console.log('1. 🎵 Play audio with synchronized lyrics');
    console.log('2. 🧪 Test sync timing (no audio)');
    console.log('3. 📊 Show timestamp statistics');
    
    // Simple command line selection
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    console.log('\nEnter your choice (1, 2, or 3):');
    player.play();
    
    // process.stdin.once('data', async (data) => {
    //     const choice = data.trim();
    //     console.log('\nYou chose:', choice);
    //     console.log(choice)
        
    //     switch (choice) {
    //         case '1':
    //             await player.play();
    //             break;
                
    //         case '2':
    //             await player.testSync();
    //             process.exit(0);
    //             break;
                
    //         case '3':
    //             showTimestampStats(player.wordTimestamps);
    //             process.exit(0);
    //             break;
                
    //         default:
    //             console.log('❌ Invalid choice');
    //             process.exit(1);
    //     }
    // });
}

function showTimestampStats(wordTimestamps) {
    console.log('📊 Timestamp Statistics:');
    console.log('========================');
    console.log(`Total words: ${wordTimestamps.length}`);
    
    if (wordTimestamps.length > 0) {
        const duration = wordTimestamps[wordTimestamps.length - 1].end;
        console.log(`Total duration: ${duration.toFixed(1)}s (${Math.floor(duration / 60)}:${(duration % 60).toFixed(0).padStart(2, '0')})`);
        
        // Count by source
        const sources = {};
        wordTimestamps.forEach(word => {
            const source = word.source || 'unknown';
            sources[source] = (sources[source] || 0) + 1;
        });
        
        console.log('\nWords by source:');
        Object.entries(sources).forEach(([source, count]) => {
            const percentage = ((count / wordTimestamps.length) * 100).toFixed(1);
            console.log(`  ${source}: ${count} (${percentage}%)`);
        });
        
        // Average word duration
        const avgDuration = wordTimestamps.reduce((sum, word) => 
            sum + (word.end - word.start), 0) / wordTimestamps.length;
        console.log(`\nAverage word duration: ${(avgDuration * 1000).toFixed(0)}ms`);
    }
}

// Run the test
testAudioSync().catch(console.error);