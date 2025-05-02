import natural from 'natural';
import { english as stopwords } from 'stopwords';
import pos from 'pos';
import { pipeline } from '@xenova/transformers';

class QueryFormation {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.tagger = new pos.Tagger();
    this.stopwords = new Set(stopwords);
  }
  
  async initializeNaturalLanguageProcessing() {
    // For keyword extraction
    this.keywordExtractor = await pipeline('token-classification', 'Xenova/bert-base-NER');
  }

  async extractTerminology(text) {
    // Basic NLP processing
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const filtered = tokens.filter(token => 
      !this.stopwords.has(token) && token.length > 2);
    
    // POS tagging to find nouns and technical terms
    const taggedWords = this.tagger.tag(filtered);
    const nouns = taggedWords
      .filter(item => item[1].startsWith('NN'))
      .map(item => item[0]);
    
    // Use NER to find named entities
    const entities = await this.keywordExtractor(text);
    const namedEntities = entities
      .filter(entity => entity.score > 0.75)
      .map(entity => entity.word);
    
    // Combine and deduplicate
    const allTerms = [...new Set([...nouns, ...namedEntities])];
    
    return allTerms;
  }

  async identifyConcepts(text) {
    // Create an NGrams tokenizer
    const NGrams = natural.NGrams;
    
    // Generate bigrams and trigrams directly (they return arrays of arrays)
    const bigrams = NGrams.bigrams(text.toLowerCase().split(' '));
    const trigrams = NGrams.trigrams(text.toLowerCase().split(' '));
    
    // Convert n-gram arrays to strings
    const ngramCandidates = [
      ...bigrams.map(bg => bg.join(' ')),
      ...trigrams.map(tg => tg.join(' '))
    ];
    
    // Filter n-grams that look like concepts (no stopwords at boundaries)
    const conceptCandidates = ngramCandidates.filter(ngram => {
      const words = ngram.split(' ');
      return !this.stopwords.has(words[0]) && !this.stopwords.has(words[words.length - 1]);
    });
    
    return conceptCandidates;
  }

  async extractDefinitionSubject(sentence) {
    // Check if sentence matches definition pattern
    if (sentence.includes(' is ') || sentence.includes(' are ') || 
        sentence.includes(' refers to ') || sentence.includes(' defined as ')) {
      
      // Simple pattern: extract what's before the definition marker
      const definitionMarkers = [' is ', ' are ', ' refers to ', ' defined as '];
      let subject = null;
      
      for (const marker of definitionMarkers) {
        if (sentence.includes(marker)) {
          subject = sentence.split(marker)[0].trim();
          break;
        }
      }
      
      // Clean up the subject
      if (subject) {
        // Remove articles and modifiers at the beginning
        subject = subject.replace(/^(the|a|an) /i, '');
        return subject;
      }
    }
    
    return null;
  }

  async formQueries(analysisResults) {
    const { currentParagraph, currentSentence, contentType } = analysisResults;
    
    // Extract key terms and concepts
    const keyTerms = await this.extractTerminology(currentParagraph);
    const keyConcepts = await this.identifyConcepts(currentParagraph);
    
    const queries = [];
    
    // Query 1: Exact recent context (highest weight)
    queries.push({
      text: currentSentence,
      weight: 1.0
    });
    
    // Query 2: Key terms only (medium weight)
    if (keyTerms.length > 0) {
      queries.push({
        text: keyTerms.join(' '),
        weight: 0.7
      });
    }
    
    // Query 3: Conceptual query (lowest weight but broader)
    if (keyConcepts.length > 0) {
      queries.push({
        text: keyConcepts.slice(0, 3).join(' '),
        weight: 0.5
      });
    }
    
    // Handle definition queries
    // if (contentType.isDefinition) {
    //   const subject = await this.extractDefinitionSubject(currentSentence);
    //   if (subject) {
    //     queries.push({
    //       text: `definition of ${subject}`,
    //       weight: 0.8
    //     });
    //   }
    // }
    
    return queries;
  }
}

export default QueryFormation;