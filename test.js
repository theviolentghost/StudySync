const prompt = "You are an expert note-taking assistant for academic lectures. You are continuously provided with the latest transcript segment from an ongoing lecture along with the current, in-progress notes. Your task is to carefully analyze both the transcript and the notes, and then directly continue or complete the notes by filling in unfinished thoughts or sentences. Do not generate abstract suggestions or high-level ideas. Instead, focus on integrating naturally with the existing notes. For example, if the notes contain an incomplete sentence like 'President Lincoln was', continue it by completing the sentence (e.g., 'the 16th president who led the country through the Civil War and abolished slavery').\n\nTranscript Segment: \"{{transcript}}\"\nCurrent Notes: \"{{notes}}\"\n\nBased on the above, please generate the continuation that seamlessly fills in any incomplete thoughts or sentences in the notes below:";


const transcript = `welcome my world history students. we are goign to learn a lot in this ap course. most importantly. we are going to be learning about. all the centuries and how the. world was around the world during these period. during world war two was quite interesting, with the development of bombs such as the atomic and hydrogen bombs`
const notes = `${"<titleCard>The Centuries: </titleCard>"}`;

prompt.replace("{{transcript}}", transcript);
prompt.replace("{{notes}}", notes);

async function test() {
    const response = await fetch("http://127.0.0.1:8080/completion", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            prompt,
            // mirostat: 2,
            stream: true, // Ensure the server supports streaming
        }),
    });

    if (!response.body) {
        console.error("ReadableStream not supported or no response body.");
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false;

    let buffer = "";

    while (!done) {

        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const startIndex = chunk.indexOf("{");
            const endIndex = chunk.lastIndexOf("}") + 1;
            const jsonString = chunk.slice(startIndex, endIndex);
            const jsonData = JSON.parse(jsonString);
            //console.log(jsonData); // Process or display the streamed chunk
            buffer += jsonData?.content;
            console.log(buffer)
        }
    }

    console.log("Streaming complete.");
}

test()