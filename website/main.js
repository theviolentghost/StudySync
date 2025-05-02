fetch("api/lectureAssistant/initialize", {

    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
    })
})
.then((response) => {
    if(response.ok) return response.json();
})
.then((data) => {
    console.log("transcript", data);
})

function uploadTranscriptChunk(text) {
    if(!text) return; 
    fetch("api/lectureAssistant/transcriptChunk", {

        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text,
        }) 
    })
    .then((response) => {
        if(response.ok) return response.json();
    })
    .then((data) => {
        console.log("transcript", data);
    })
}

function uploadNoteChunk(text) {
    if(!text) return; 
    fetch("api/lectureAssistant/noteChunk", {

        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text,
        }) 
    })
    .then((response) => {
        if(response.ok) return response.json();
    })
    .then((data) => {
        console.log("note", data);
    })
}
async function fetchSuggestions() {
    const outputElement = document.getElementById('suggestions-output');
    outputElement.textContent = 'Loading suggestions...';
    
    try {
        // Make a fetch request with the appropriate headers for SSE
        const response = fetch('/api/lectureAssistant/getSuggestions', {
            method: 'POST',
            headers: {
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                
            }),
        })
        .then((response) => {
            console.log(response);
        });
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        outputElement.innerHTML = `<p class="error">Failed to load suggestions: ${error.message}</p>`;
    }
}


uploadTranscriptChunk("hello class today we will be learning about.");
uploadTranscriptChunk("world history throughout the ages. the first powerful civilization was the Chinese empire.");
uploadTranscriptChunk("they were the first to invent gunpowder. originally used for fireworks and not weapons");

// uploadNoteChunk("Geroge Washington is the founder of calculus.");
uploadNoteChunk("gunpowder was invented by the mongolians and were used for attacking the sunnis. Donald trump was the leader of the chinese empire");

setTimeout(fetchSuggestions, 15000);