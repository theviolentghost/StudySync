import { spawn } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import EventEmitter from 'events';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LLama extends EventEmitter {
    static upload_directory = path.join(__dirname, 'storage', 'uploads');
    static llama_server_path = path.join(__dirname, 'llama.cpp', 'build', 'bin', 'llama-server');
    static llama_model_path = path.join(__dirname, 'models', 'model');
    static llama_mmproj_model_path = path.join(__dirname, 'models', 'mmproj');
    
    constructor(config = {}) {
        super();

        this.config = {
            model_name: config.model_name,
            multi_model: config.multi_model || false,
            mmproj_model_name: config.mmproj_model_name || null,
            host: config.host || '127.0.0.1',
            port: config.port || 8080,
            context_size: config.context_size || 4096,
            threads: config.threads || 8,
            gpu_layers: config.gpu_layers || 32,
            temperature: config.temperature || 0.7,
            top_k: config.top_k || 40,
            top_p: config.top_p || 0.9,
            repeat_penalty: config.repeat_penalty || 1.1,
            max_tokens: config.max_tokens || 512,
            system_prompt: config.system_prompt || null,
            use_server: !config.multi_model,
        };

        this.server_process = null;
        this.is_running = false;
        this.current_model = null;
        this.pending_requests = new Map();
        this.request_id = 0;

        this.ensure_upload_directory();
    }

    async ensure_upload_directory() {
        try {
            await fs.mkdir(LLama.upload_directory, { recursive: true });
        } catch (error) {
            console.error('Error creating upload directory:', error);
        }
    }

    async create_server() {
        if (this.is_running) {
            console.error('Server is already running');
            return;
        }

        const model_path = path.join(LLama.llama_model_path, this.config.model_name);
        if (!fsSync.existsSync(model_path)) {
            console.error(`Model path does not exist: ${model_path}`);
            return;
        }

        const args = [
            '--model', model_path,
            '--host', this.config.host,
            '--port', this.config.port.toString(),
            '--threads', this.config.threads.toString(),
            '--n-gpu-layers', this.config.gpu_layers.toString(),
            '--temp', this.config.temperature.toString(),
            '--top-k', this.config.top_k.toString(),
            '--top-p', this.config.top_p.toString(),
            '--repeat-penalty', this.config.repeat_penalty.toString(),
            '--system-prompt', this.config.system_prompt || '',
            '--context-size', this.config.context_size.toString(),
        ];

        if(this.config.multi_model && this.config.mmproj_model_name) {
            const mmproj_model_path = path.join(LLama.llama_mmproj_model_path, this.config.mmproj_model_name);
            if (!fsSync.existsSync(mmproj_model_path)) {
                console.error(`MMProj model path does not exist: ${mmproj_model_path}`);
                return;
            }
            args.push('--mmproj', mmproj_model_path);
        }

        console.log(args)

        return new Promise((resolve, reject) => {
            this.server_process = spawn(LLama.llama_server_path, args);
            let server_ready = false;

            this.server_process.stdout.on('data', (data) => {
                const output = data.toString();
                console.log(output);
            });

            this.server_process.stderr.on('data', (data) => {
                const error = data.toString();
                console.error(`Server stderr: ${error}`);

                if (error.includes('starting the main loop') || error.includes('all slots are idle')) {
                    server_ready = true;
                    this.is_running = true;
                    this.current_model = this.config.model_name;
                    resolve({
                        status: 'running',
                        model: this.config.model_name,
                        host: this.config.host,
                        port: this.config.port,
                        pid: this.server_process.pid
                    });
                }
            });

            this.server_process.on('error', (error) => {
                console.error(`Failed to start server: ${error.message}`);
                this.is_running = false;
                reject(new Error(`Failed to start server: ${error.message}`));
            });

            this.server_process.on('exit', (code, signal) => {
                console.error(`Server process exited with code ${code} and signal ${signal}`);
                this.is_running = false;
                this.server_process = null;
                this.current_model = null;
                this.emit('server_exit', { code, signal });
            });

            setTimeout(() => {
                if (!server_ready) {
                    this.kill_server();
                    reject(new Error(`Server failed to start within timeout`));
                }
            }, 30000);
        });
    }

    async generate(prompt) {
        const axios = (await import('axios')).default;
        
        try {
            const payload = {
                prompt: prompt,
                n_predict: this.config.max_tokens,
                temperature: this.config.temperature,
                top_k: this.config.top_k,
                top_p: this.config.top_p,
                repeat_penalty: this.config.repeat_penalty,
            };

            // System prompt is handled at server startup
            
            const response = await axios.post(`http://${this.config.host}:${this.config.port}/completion`, payload);
            return response.data.content;
        } catch (error) {
            console.error('Error generating via server:', error);
            throw error;
        }
    }

    async kill_server() {
        if (!this.is_running || !this.server_process) {
            console.error('Server is not running');
            return;
        }

        return new Promise((resolve, reject) => {
            this.server_process.on('exit', (code, signal) => {
                this.is_running = false;
                this.current_model = null;
                this.server_process = null;
                resolve({ status: 'stopped', code, signal });
            });

            this.server_process.kill('SIGTERM');

            setTimeout(() => {
                if (this.server_process) {
                    this.server_process.kill('SIGKILL');
                }
            }, 5000);
        });
    }
}

export default LLama;