import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LlamaBinDirectory = path.resolve(__dirname, 'llama.cpp/build/bin');
const ModelDirectory = path.resolve(__dirname, 'models');

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

async function run(buffer, model, prompt = "Hello Newt!", paramaters = []) {
    try {
        if(!buffer) throw new Error("no buffer provided");
        if(!model) throw new Error("no model provided");

        const LlamaConfiguration = readJSONfile(path.resolve(ModelDirectory, model, "configuration.json"));

        return new Promise((resolve, reject) => {
            const llama = spawn(path.join(LlamaBinDirectory, 'llama-cli'), [
                '--model', path.resolve(ModelDirectory, model, "model.gguf"),
                '-p', LlamaConfiguration.prompt.replace("{{prompt}}", prompt), // includes role
                ...LlamaConfiguration.config,
                ...paramaters
            ]);

            llama.stdout.on('data', (data) => {
                buffer.push(data);
            });

            llama.on('close', (code) => {
                if (code === 0) resolve(); 
                else reject(new Error(`Llama process exited with code ${code}`)); 
            });
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function createServer(model, port = 8080) {
    try {
        if(!model) throw new Error("no model provided");
        const LlamaConfiguration = readJSONfile(path.resolve(ModelDirectory, model, "configuration.json"));

        return new Promise((resolve, reject) => {
            const llama = spawn(path.join(LlamaBinDirectory, 'llama-server'), [
                '--model', path.resolve(ModelDirectory, model, "model.gguf"),
                '--port', port,
                ...LlamaConfiguration.config
            ]);

            resolve(llama);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

export default { run, createServer };