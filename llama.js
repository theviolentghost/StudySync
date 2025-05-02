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

        if(LlamaConfiguration.useGrammar) {
            LlamaConfiguration.config.push("--grammar-file");
            LlamaConfiguration.config.push(path.resolve(ModelDirectory, model, "grammar.gbnf"));
        }

        return new Promise((resolve, reject) => {
            const llama = spawn(path.join(LlamaBinDirectory, 'llama-cli'), [
                '--model', path.resolve(ModelDirectory, "model" , `${LlamaConfiguration.modelName}.gguf`),
                '-p', prompt,
                ...LlamaConfiguration.config,
                ...paramaters
            ]);

            llama.stdout.on('data', (data) => {
                buffer.push(data.toString());
            });

            llama.stderr.on('data', (data) => {
                console.error(`Error: ${data.toString()}`);
            });

            llama.on('close', (code) => {
                if (code === 0) resolve(); 
                else reject(`Llama process exited with code ${code}`); 
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

        if(LlamaConfiguration.useGrammar) {
            LlamaConfiguration.config.push("--grammar-file");
            LlamaConfiguration.config.push(path.resolve(ModelDirectory, model, "grammar.gbnf"));
        }

        return new Promise((resolve, reject) => {
            const llama = spawn(path.join(LlamaBinDirectory, 'llama-server'), [
                '--model', path.resolve(ModelDirectory, "model", `${LlamaConfiguration.modelName}.gguf`),
                '--port', port,
                '--host', '127.0.0.1',
                ...LlamaConfiguration.config
            ]);

            resolve(llama);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

function stopServer(server = null) {
    if(!server) return;

    server.on('exit', (code) => {
        console.log(`Llama server exited with code ${code}`);
    });
    server.kill('SIGINT');
}

export default { run, createServer, stopServer };