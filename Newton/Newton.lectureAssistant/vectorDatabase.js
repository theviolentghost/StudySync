import hnswlib from 'hnswlib-node';
import { pipeline } from '@xenova/transformers';

class VectorDatabase {
  constructor(embeddingDimension = 384, maxElements = 10000) {
    this.index = new hnswlib.HierarchicalNSW('l2', embeddingDimension);
    this.maxElements = maxElements;
    this.index.initIndex(this.maxElements, 16, 200);
    
    this.chunks = [];
    this.currentID = 0;
  }

  async inititializeEmbeddingModel() {
    this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  async addChunk(content, data = {}) {
    const embedding = await this.generateEmbedding(content);
    
    // Add to index
    this.index.addPoint(embedding, this.currentID);
    
    // Store metadata
    this.chunks.push({
      ID: this.currentID,
      content: content,
      embedding: embedding,
      data: data,
    });
    
    return this.currentID++;
  }

  async generateEmbedding(text) {
    if(!text) return console.error("no text: ", text);

    const output = await this.embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  async search(queries, topK = 5) {
    const results = [];
    
    // Process each query with its weight
    for (const query of queries) {
      const queryText = query.text;
      const queryWeight = query.weight;
      
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(queryText);
      
      // Search the index
      const searchResults = this.index.searchKnn(queryEmbedding, topK);
      
      // Process results
      for (let i = 0; i < searchResults.neighbors.length; i++) {
        const chunkIndex = searchResults.neighbors[i];
        const distance = searchResults.distances[i];
        
        // Calculate score (lower distance is better)
        const similarityScore = 1.0 / (1.0 + distance);
        const weightedScore = similarityScore * queryWeight;
        
        // Get the chunk
        const chunk = this.chunks[chunkIndex];
        
        // Add to results
        results.push({
          chunkID: chunk.ID,
          content: chunk.content,
          score: weightedScore,
          query: queryText,
          data: chunk.data,
        });
      }
    }
    
    // Merge duplicate chunks and sum their scores
    const mergedResults = {};
    for (const result of results) {
      const chunkID = result.chunkID;
      if (mergedResults[chunkID]) {
        mergedResults[chunkID].score += result.score;
        mergedResults[chunkID].matchedQueries.push(result.query);
      } else {
        result.matchedQueries = [result.query];
        mergedResults[chunkID] = result;
      }
    }
    
    // Sort by score and return top results
    const finalResults = Object.values(mergedResults);
    finalResults.sort((a, b) => b.score - a.score);
    
    return finalResults.slice(0, topK);
  }

  // Save/load functionality
  async save(filePath) {
    await this.index.writeIndex(filePath + '.index');
    await fs.writeFile(filePath + '.meta', JSON.stringify(this.chunks));
  }

  async load(filePath) {
    await this.index.readIndex(filePath + '.index');
    const metaData = await fs.readFile(filePath + '.meta', 'utf8');
    this.chunks = JSON.parse(metaData);
    this.currentId = this.chunks.length;
  }
}

class NotesDatabase extends VectorDatabase {
  constructor(embeddingDimension = 384, maxElements = 5000) {
    super(embeddingDimension, maxElements);
  }

  async addNoteChunk(noteText, metadata = {}) {
    return super.addChunk(noteText, metadata);
  }

  async search(queries, topK = 5) {
    return super.search(queries, topK);
  }
}

class TranscriptDatabase extends VectorDatabase {
  constructor(embeddingDimension = 384, maxElements = 5000) {
    super(embeddingDimension, maxElements);
  }

  async addTranscriptChunk(transcriptText, metadata = {}) {
    return super.addChunk(transcriptText, metadata);
  }

  async search(queries, topK = 5) {
    return super.search(queries, topK);
  }
}

export default { VectorDatabase, NotesDatabase, TranscriptDatabase };