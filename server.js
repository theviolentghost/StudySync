import Newton from "./studySyncAssistant/newton.js";

(async () => {
    const newton = new Newton("Newton.assistant.large");

    await newton.initialize();

    await newton.addTranscriptChunk({
        text: "Hello, this is a test. This is another sentence. And one more.",
        timestamp: 1234567890
    });

    await newton.addTranscriptChunk({
        text: "This is a second test. This is another sentence. And one more.",
        timestamp: 1234567890
    });
    

    //console.log(buffer.join(''));
})();