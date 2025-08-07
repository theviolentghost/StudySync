// const fetch = require('node-fetch');
import fetch from 'node-fetch';
import readline from 'readline';

const systemPrompt = `
Whenever you want to perform a web search, you MUST output the following tag on a new line:
<|web_search|> your search query <|/web_search|>
`;

const userPrompt = `Please output the web search tag for the weather in France. use this token`;

const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gemma-tools',  // or whatever model you're running
    prompt: userPrompt,
    system: systemPrompt,
    stream: true,
    // stop: ['<|/websearch|>', '<|reserved_98|>'],
    custom_tokens: ['<|web_search|>', '<|/web_search|>']
  })
});

if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}

console.log(response.body);

const rl = readline.createInterface({
  input: response.body,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  if (line.trim()) {
    try {
      const obj = JSON.parse(line);
      console.log('NDJSON object:', obj);
      // You can access obj.response or other fields here
    } catch (e) {
      console.error('Failed to parse NDJSON line:', line, e);
    }
  }
});

rl.on('close', () => {
  console.log('Stream ended.');
});
