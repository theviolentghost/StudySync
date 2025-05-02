import QueryFormation from "./queryFormation.js";
import Database from "./vectorDatabase.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import Newton from "../newton.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJSONfile(filePath) {
    try {
        const absolutePath = path.resolve(__dirname, filePath);
        const fileContents = fs.readFileSync(absolutePath, 'utf-8'); // Read the file synchronously
        return JSON.parse(fileContents); // Parse and return the JSON object
    } catch (error) {
        console.error('Error reading or parsing JSON file:', error);
        return null;
    }
}

class NewtonLectureAssistant extends Newton {
    constructor(size = "default") {
        super();
        this.modelToUse = `Newton.lectureAssistant.${size}`;
        this.promptTemplate = "";

        this.notesVectorDatabase = new Database.NotesDatabase(384, 5000);
        this.transcriptVectorDatabase = new Database.TranscriptDatabase(384, 5000);
        this.queryFormation = new QueryFormation();

        this.uncheckedTranscriptChunks = [];
        this.uncheckedNoteChunks = [];
    }
    async initialize() {
        await super.initialize();

        await this.notesVectorDatabase.inititializeEmbeddingModel();
        await this.transcriptVectorDatabase.inititializeEmbeddingModel();
        await this.queryFormation.initializeNaturalLanguageProcessing();

        this.promptTemplate = readJSONfile(path.resolve("models", this.modelToUse, "configuration.json")).prompt;
    }
    async addTranscriptChunk(chunk = {text: "", timestamp: -1, ID: -1}) {
        if (!chunk.text) return; // nothing to add

        const chunkedTranscript = this.trimText(chunk.text);
        this.uncheckedTranscriptChunks = this.uncheckedTranscriptChunks.concat(chunkedTranscript);

        await Promise.all(
            chunkedTranscript.map(
                chunk => this.transcriptVectorDatabase.addTranscriptChunk(chunk, {timestamp: chunk.timestamp})
            )
        );
    }
    async addNoteChunk(chunk = {text: ""}) {
        if(!chunk.text) return; // nothing to add

        const chunkedNotes = this.trimText(chunk.text);
        this.uncheckedNoteChunks = this.uncheckedNoteChunks.concat(chunkedNotes);

        await Promise.all(
            chunkedNotes.map(
                chunk => this.notesVectorDatabase.addNoteChunk(chunk)
            )
        );
    }
    trimText(text) {
        return text.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
    }
    async searchTranscript(queries, topK = 5) {
        return this.transcriptVectorDatabase.search(queries, topK);
    }
    async searchNotes(queries, topK = 5) {
        return this.notesVectorDatabase.search(queries, topK);
    }
    async getSuggestions(res) {
        try {

            let prompt = this.promptTemplate;
            prompt = prompt.replace("{{transcript}}", this.uncheckedTranscriptChunks.join(" "));
            prompt = prompt.replace("{{notes}}", this.uncheckedNoteChunks.join(" "));
    
            console.log("Generating suggestions from prompt...");
            console.log("Prompt: ", prompt);
            
            // Set up headers for SSE (Server-Sent Events)
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            
            // Send a connection established event
            // res.write('event: connected\ndata: Connection established\n\n');

            console.log("hey")
            
            // Make request to AI service
            axios.post("http://127.0.0.1:8080/completion", {
                prompt: prompt,
                // stream: true,
            }, {
                // responseType: 'stream' // Important for streaming
            })
            .then(async (response) => {
                console.log("Response: ", response.data);
            });
        } catch (error) {
            console.error('Error getting suggestions:', error);
            
            // If response object is available, send error
            if (res && typeof res.writeHead === 'function') {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to generate suggestions' }));
            }
            
            throw error;
        }
    }
}

export default NewtonLectureAssistant;