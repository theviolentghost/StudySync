/*
Newton is the name of the AI assistant that helps students

*/
import LLama from "../llama.js";
import QueryFormation from "./queryFormation.js";
import VectorDatabase from "./vectorDatabase.js";

class Newton {
    constructor(size = "medium") {
        this.modelToUse = `Newton.${size}`;
        this.model = null;

    }
    async initialize() {
        this.startUpServer();

        console.log("Newton initialized");
    }
    async startUpServer(port = 8080) {
        this.model = await LLama.createServer(this.modelToUse, port);
        console.log(`Newton server started on port ${port}`);
    }
    // async addTranscriptChunk(transcriptChunk = {text: "", timestamp: 0}) {
    //     if (!transcriptChunk.text) return; // nothing to add

    //     this.lectureTranscript.push(transcriptChunk);

    //     // chunk into sentences
    //     // add to vector database
    //     const chunkedTranscript = this.chunkTranscript(transcriptChunk.text);

    //     await Promise.all(
    //         chunkedTranscript.map(chunk => this.vectorDatabase.addLectureChunk(chunk, transcriptChunk.timestamp))
    //     );
    // }
    // chunkTranscript(text) {
    //     return text.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
    // }
}

class NewtonLectureAssistant extends Newton {
    constructor(size = "medium") {
        super(size);
    }
    async initialize() {
        await super.initialize();

        // this.vectorDatabase = new VectorDatabase();
        // this.queryFormation = new QueryFormation();
    }
}

export default NewtonAssitant;