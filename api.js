import NewtonLectureAssistant from "./newton/Newton.lectureAssistant/netwon.js";

const LectureAssistant = new NewtonLectureAssistant("default");

async function handlePost(res, path, data = {}) {
    let endPoint = path.substring(("/api/").length);

    switch(endPoint) {
        case "lectureAssistant/initialize": {
            LectureAssistant.initialize();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Lecture Assistant Initialized" }));
            break;
        }
        case "lectureAssistant/getSuggestions": {
            try {
                if(!LectureAssistant.initialized) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Lecture Assistant not initialized' }));
                    return;
                }
                await LectureAssistant.getSuggestions(res);
            } catch (error) {
                console.error('Error getting suggestions:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to generate suggestions' }));
            }
            break;
        }
        case "lectureAssistant/transcriptChunk": {
            if(!data.text) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No text provided' }));
                return;
            }
            LectureAssistant.addTranscriptChunk(data.text);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Transcript chunk uploaded" }));
            break;
        }
        case "lectureAssistant/noteChunk": {
            if(!data.text) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No text provided' }));
                return;
            }
            LectureAssistant.addNoteChunk(data.text);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: "Note chunk uploaded" }));
            break;
        }
            
            
        default:
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
            break;
    }
}

async function handleGet(res, path, data = {}) {
    
}



export default {handlePost, handleGet};