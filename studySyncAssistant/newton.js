/*
Newton is the name of the AI assistant that helps students

*/
import LLama from "../llama.js";
import QueryFormation from "./queryFormation.js";
import VectorDatabase from "./vectorDatabase.js";

class NewtonAssitant {
    constructor(model) {
        this.modelToUse = model;
        this.model = null;

        this.queryFormation = new QueryFormation();
        this.vectorDatabase = new VectorDatabase(384, 65536);

        this.lectureTranscript = [];
        this.userNotes = [];
    }
    async initialize() {
        await this.queryFormation.initializeNaturalLanguageProcessing();
        await this.vectorDatabase.inititializeEmbeddingModel();

        this.startUpServer();

        console.log("Newton Assistant initialized");
    }
    async startUpServer(port = 8080) {
        this.model = await LLama.createServer(this.modelToUse, port);
        console.log(`Newton Assistant server started on port ${port}`);
    }
    async addTranscriptChunk(transcriptChunk = {text: "", timestamp: 0}) {
        if (!transcriptChunk.text) return; // nothing to add

        this.lectureTranscript.push(transcriptChunk);

        // chunk into sentences
        // add to vector database
        const chunkedTranscript = this.chunkTranscript(transcriptChunk.text);

        await Promise.all(
            chunkedTranscript.map(chunk => this.vectorDatabase.addLectureChunk(chunk, transcriptChunk.timestamp))
        );
    }
    chunkTranscript(text) {
        return text.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
    }
}

export default NewtonAssitant;