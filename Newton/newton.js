import LLama from "../llama.js";

class Newton {
    constructor(size = "default") {
        this.model = null;
        this.initialized = false;
    }
    async initialize() {
        await this.startUpServer();
        console.log("Newton initialized");
        this.initialized = true;
        return this;
    }
    async startUpServer(port = process.env.API_PORT || 8080) {
        if(!this.modelToUse) return console.error("No model to use");

        this.model = await LLama.createServer(this.modelToUse, port);
        console.log(`Newton server started on port ${port}`);
    }
    killServer() {
        if(!this.model) return console.error("No model to kill");
        
        LLama.stopServer(this.model);
        this.model = null;
        console.log("Newton server killed");
    }
}

export default Newton;