import hnswlib from 'hnswlib-node';
import { pipeline } from '@xenova/transformers';

class VectorDatabase {
  constructor(embeddingDimension = 384, maxElements = 10000) {
    this.index = new hnswlib.HierarchicalNSW('l2', embeddingDimension);
    this.maxElements = maxElements;
    this.index.initIndex(this.maxElements, 16, 200);
    
    this.chunks = [];
    this.currentId = 0;
  }

  async inititializeEmbeddingModel() {
    this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  async addLectureChunk(chunkText, timestamp, slideId = null) {
    // Generate embedding
    // console.log(chunkText);
    const embedding = await this.generateEmbedding(chunkText);
    
    // Add to index
    this.index.addPoint(embedding, this.currentId);
    
    // Store metadata
    this.chunks.push({
      id: this.currentId,
      text: chunkText,
      timestamp,
      slideId
    });
    
    return this.currentId++;
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
        const idx = searchResults.neighbors[i];
        const distance = searchResults.distances[i];
        
        // Calculate score (lower distance is better)
        const similarityScore = 1.0 / (1.0 + distance);
        const weightedScore = similarityScore * queryWeight;
        
        // Get the chunk
        const chunk = this.chunks[idx];
        
        // Add to results
        results.push({
          chunkId: chunk.id,
          text: chunk.text,
          timestamp: chunk.timestamp,
          slideId: chunk.slideId,
          score: weightedScore,
          query: queryText
        });
      }
    }
    
    // Merge duplicate chunks and sum their scores
    const mergedResults = {};
    for (const result of results) {
      const chunkId = result.chunkId;
      if (mergedResults[chunkId]) {
        mergedResults[chunkId].score += result.score;
        mergedResults[chunkId].matchedQueries.push(result.query);
      } else {
        result.matchedQueries = [result.query];
        mergedResults[chunkId] = result;
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

export default VectorDatabase;