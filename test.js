import 'dotenv/config';
import { getLyrics } from 'genius-lyrics-api';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const geniusOptions = {
  apiKey: process.env.GENIUS_ACCESS_TOKEN, 
  title: 'Never Gonna Give You Up',
  artist: 'Rick Astley',
  optimizeQuery: true
};

async function enhancedTranscription(audioPath) {
    console.log('🎵 Step 1: Fetching lyrics from Genius...');
    
    try {
        // Get full lyrics from Genius
        const fullLyrics = await getLyrics(geniusOptions);
        
        if (!fullLyrics) {
            console.log('⚠️ No lyrics found, using standard transcription');
            return await transcribeWithWhisper(audioPath);
        }
        
        console.log('✅ Lyrics fetched successfully!');
        console.log('📝 Full lyrics length:', fullLyrics.length);
        
        // Step 2: Use faster-whisper with lyrics guidance
        const transcriptionResult = await transcribeWithLyricsGuidance(audioPath, fullLyrics);
        
        // Step 3: Align and correct using lyrics
        const alignedResult = await alignWithLyrics(transcriptionResult, fullLyrics);
        
        return alignedResult;
        
    } catch (error) {
        console.error('❌ Error in enhanced transcription:', error.message);
        // Fallback to standard transcription
        return await transcribeWithWhisper(audioPath);
    }
}

async function transcribeWithLyricsGuidance(audioPath, lyrics) {
    console.log('🚀 Step 2: Transcribing with lyrics guidance...');
    
    return new Promise((resolve, reject) => {
        const outputDir = './whisper_output';
        
        // Use lyrics as initial prompt (first 244 chars)
        const prompt = lyrics.substring(0, 244);
        
        const args = [
            audioPath,
            '--model', 'base.en',
            '--output_format', 'json',
            '--output_dir', outputDir,
            '--language', 'en',
            '--word_timestamps', 'True',
            '--initial_prompt', prompt,
            '--beam_size', '5',
            '--best_of', '5',
            '--temperature', '0'  // More deterministic
        ];

        console.log('🎯 Using lyrics prompt:', prompt.substring(0, 100) + '...');
        
        const whisper = spawn('whisper', args, {
            shell: true,
            env: { ...process.env, PATH: process.env.PATH + ':/Users/norbertzych/.local/bin' }
        });

        let output = '';
        let error = '';

        whisper.stdout.on('data', (data) => {
            const line = data.toString();
            output += line;
            console.log('📝', line.trim());
        });

        whisper.stderr.on('data', (data) => {
            const line = data.toString();
            error += line;
            console.log('ℹ️', line.trim());
        });

        whisper.on('close', async (code) => {
            if (code === 0) {
                try {
                    const audioBaseName = path.basename(audioPath, path.extname(audioPath));
                    const jsonPath = path.join(outputDir, `${audioBaseName}.json`);
                    
                    const jsonContent = await fs.readFile(jsonPath, 'utf8');
                    const whisperData = JSON.parse(jsonContent);
                    
                    const wordTimestamps = extractWordTimestamps(whisperData);
                    
                    resolve({
                        word_timestamps: wordTimestamps,
                        whisper_data: whisperData,
                        full_lyrics: lyrics
                    });
                    
                } catch (readError) {
                    reject(new Error('Error reading Whisper output: ' + readError.message));
                }
            } else {
                reject(new Error(`Whisper failed with code ${code}: ${error}`));
            }
        });

        whisper.on('error', (err) => {
            reject(err);
        });
    });
}

function alignWithLyrics(transcriptionResult, fullLyrics) {
    console.log('🎯 Step 3: Aligning with full lyrics...');
    
    const { word_timestamps } = transcriptionResult;
    const lyricsWords = fullLyrics.toLowerCase()
        .replace(/[^\w\s]/g, ' ')  // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 0);
    
    console.log(`📊 Transcribed: ${word_timestamps.length} words, Lyrics: ${lyricsWords.length} words`);
    
    // Perform sequence alignment
    const alignedWords = performSequenceAlignment(word_timestamps, lyricsWords);
    
    return {
        aligned_words: alignedWords,
        original_transcription: word_timestamps,
        full_lyrics: fullLyrics,
        lyrics_words: lyricsWords,
        alignment_stats: {
            transcribed_words: word_timestamps.length,
            lyrics_words: lyricsWords.length,
            aligned_words: alignedWords.length,
            coverage: (alignedWords.length / lyricsWords.length * 100).toFixed(1) + '%'
        }
    };
}

function performSequenceAlignment(transcribedWords, lyricsWords) {
    console.log('🔄 Performing sequence alignment...');
    
    const aligned = [];
    let lyricsIndex = 0;
    
    for (const transcribedWord of transcribedWords) {
        const cleanTranscribed = transcribedWord.word.toLowerCase().replace(/[^\w]/g, '');
        
        // Look for the transcribed word in the lyrics starting from current position
        let foundIndex = -1;
        for (let i = lyricsIndex; i < Math.min(lyricsIndex + 10, lyricsWords.length); i++) {
            const lyricsWord = lyricsWords[i];
            
            if (cleanTranscribed === lyricsWord || 
                cleanTranscribed.includes(lyricsWord) || 
                lyricsWord.includes(cleanTranscribed) ||
                levenshteinDistance(cleanTranscribed, lyricsWord) <= 1) {
                foundIndex = i;
                break;
            }
        }
        
        if (foundIndex !== -1) {
            // Fill in any skipped lyrics words with estimated timing
            while (lyricsIndex < foundIndex) {
                const estimatedTiming = estimateWordTiming(
                    lyricsWords[lyricsIndex], 
                    transcribedWord, 
                    lyricsIndex - foundIndex
                );
                
                aligned.push({
                    word: lyricsWords[lyricsIndex],
                    start: estimatedTiming.start,
                    end: estimatedTiming.end,
                    probability: 0.3,
                    source: 'lyrics_estimated',
                    lyrics_index: lyricsIndex
                });
                lyricsIndex++;
            }
            
            // Add the matched word with actual timing
            aligned.push({
                word: lyricsWords[foundIndex],
                start: transcribedWord.start,
                end: transcribedWord.end,
                probability: transcribedWord.probability,
                source: 'transcription_aligned',
                lyrics_index: foundIndex,
                transcribed_word: transcribedWord.word
            });
            
            lyricsIndex = foundIndex + 1;
        } else {
            // Word not found in lyrics - might be a transcription error
            aligned.push({
                word: transcribedWord.word,
                start: transcribedWord.start,
                end: transcribedWord.end,
                probability: transcribedWord.probability * 0.5, // Lower confidence
                source: 'transcription_only',
                lyrics_index: -1
            });
        }
    }
    
    // Add any remaining lyrics words with estimated timing
    if (lyricsIndex < lyricsWords.length && aligned.length > 0) {
        const lastWord = aligned[aligned.length - 1];
        const remainingWords = lyricsWords.slice(lyricsIndex);
        const avgWordDuration = 0.5; // 500ms per word estimate
        
        remainingWords.forEach((word, index) => {
            aligned.push({
                word: word,
                start: lastWord.end + (index * avgWordDuration),
                end: lastWord.end + ((index + 1) * avgWordDuration),
                probability: 0.2,
                source: 'lyrics_extrapolated',
                lyrics_index: lyricsIndex + index
            });
        });
    }
    
    console.log(`✅ Alignment complete: ${aligned.length} total words`);
    return aligned;
}

function estimateWordTiming(word, referenceWord, offset) {
    const avgWordDuration = 0.4; // 400ms per word
    const timingOffset = offset * avgWordDuration;
    
    return {
        start: referenceWord.start + timingOffset,
        end: referenceWord.start + timingOffset + avgWordDuration
    };
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

function extractWordTimestamps(whisperData) {
    const wordTimestamps = [];
    
    if (whisperData.segments) {
        for (const segment of whisperData.segments) {
            if (segment.words) {
                for (const word of segment.words) {
                    wordTimestamps.push({
                        word: word.word.trim(),
                        start: word.start,
                        end: word.end,
                        probability: word.probability || 0
                    });
                }
            }
        }
    }
    
    return wordTimestamps;
}

async function transcribeWithWhisper(audioPath) {
    console.log('🎤 Starting transcription with timestamps...');
    
    return new Promise((resolve, reject) => {
        // Create output directory
        const outputDir = './whisper_output';
        
        const args = [
            audioPath,
            '--model', 'base.en',
            '--output_format', 'json',  // JSON format gives us timestamps
            '--output_dir', outputDir,
            '--language', 'en',
            '--word_timestamps', 'True'  // Enable word-level timestamps
        ];

        console.log('Whisper command:', 'whisper', args.join(' '));
        
        const whisper = spawn('whisper', args, {
            shell: true,
            env: { ...process.env, PATH: process.env.PATH + ':/Users/norbertzych/.local/bin' }
        });

        let output = '';
        let error = '';

        whisper.stdout.on('data', (data) => {
            const line = data.toString();
            output += line;
            console.log('📝', line.trim());
        });

        whisper.stderr.on('data', (data) => {
            const line = data.toString();
            error += line;
            console.log('ℹ️', line.trim());
        });

        whisper.on('close', async (code) => {
            console.log(`\n🏁 Transcription finished with code: ${code}`);
            
            if (code === 0) {
                try {
                    // Read the JSON output file
                    const audioBaseName = path.basename(audioPath, path.extname(audioPath));
                    const jsonPath = path.join(outputDir, `${audioBaseName}.json`);
                    
                    console.log('📁 Looking for JSON file at:', jsonPath);
                    
                    const jsonContent = await fs.readFile(jsonPath, 'utf8');
                    const whisperData = JSON.parse(jsonContent);
                    
                    // Extract word-level timestamps
                    const wordTimestamps = extractWordTimestamps(whisperData);
                    
                    console.log('✅ Successfully extracted timestamps');
                    console.log('📊 Number of words:', wordTimestamps.length);
                    
                    resolve(wordTimestamps);
                    
                } catch (readError) {
                    console.error('❌ Error reading JSON output:', readError);
                    reject(new Error('Error reading Whisper JSON output: ' + readError.message));
                }
            } else {
                console.error('❌ Whisper failed with error:', error);
                reject(new Error(`Whisper failed with code ${code}: ${error}`));
            }
        });

        whisper.on('error', (err) => {
            console.error('❌ Whisper spawn error:', err);
            reject(err);
        });
    });
}

async function main() {
    try {
        const audioPath = '/Users/norbertzych/Desktop/Projects/study_sinc/rick.mp3';
        
        console.log('🚀 Starting enhanced transcription with lyrics...\n');
        const startTime = Date.now();
        
        const result = await enhancedTranscription(audioPath);
        
        const endTime = Date.now();
        const totalTime = (endTime - startTime) / 1000;
        
        console.log('\n🎉 Enhanced Results:');
        console.log('==================');
        console.log(`⏱️ Total time: ${totalTime.toFixed(2)}s`);
        console.log(`📊 ${result.alignment_stats?.alignment_stats || 'Stats unavailable'}`);
        
        // Show sample aligned words
        const wordsToShow = result.aligned_words || result.word_timestamps || [];
        console.log('\n🎯 Sample aligned words:');
        
        wordsToShow.slice(0, 15).forEach((word, index) => {
            const source = word.source ? ` (${word.source})` : '';
            const prob = word.probability ? `${(word.probability * 100).toFixed(1)}%` : 'N/A';
            console.log(`${index}. "${word.word}" [${word.start.toFixed(3)}s - ${word.end.toFixed(3)}s] ${prob}${source}`);
        });
        
        // Save results
        await fs.writeFile('./enhanced_word_timestamps.json', JSON.stringify(result, null, 2));
        console.log('\n💾 Enhanced results saved to enhanced_word_timestamps.json');
        
        // Create LRC format for karaoke
        const lrcContent = createLRCFormat(result.aligned_words || result.word_timestamps || []);
        await fs.writeFile('./lyrics.lrc', lrcContent);
        console.log('💾 LRC format saved to lyrics.lrc');
        
        return result;
        
    } catch (error) {
        console.error('❌ Main error:', error.message);
    }
}

function createLRCFormat(words) {
    let lrc = '[ti:Never Gonna Give You Up]\n[ar:Rick Astley]\n[al:Whenever You Need Somebody]\n\n';
    
    words.forEach(word => {
        const minutes = Math.floor(word.start / 60);
        const seconds = (word.start % 60).toFixed(2);
        lrc += `[${minutes.toString().padStart(2, '0')}:${seconds.padStart(5, '0')}]${word.word}\n`;
    });
    
    return lrc;
}

main();