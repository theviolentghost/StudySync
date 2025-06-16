import LLama from './llama.js';

const newton = new LLama({
    model_name: 'multi/gemma-3-4b-it-q4_0.gguf',
    multi_model: true,
    mmproj_model_name: 'mmproj-model-f16-4B.gguf',
});
newton.create_server().then(async (result) => {
    console.log('Server started successfully:', result);

    const response = await newton.generate("hi there gemma. how are you doing today?");
    console.log('Response:', response);
});

