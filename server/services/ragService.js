const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const DocumentEmbedding = require('../models/DocumentEmbedding');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key' });

const hasRealKey = () => process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy_key';

/**
 * Extracts raw text from a PDF Buffer
 */
async function parsePDFBuffer(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Simple Naive text chunker based on overlapping windows
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + chunkSize);
    chunks.push(chunk);
    i += (chunkSize - overlap);
  }
  return chunks;
}

/**
 * Connects to OpenAI to generate 1536-dimensional embeddings for an array of strings
 */
async function generateEmbeddings(texts) {
  if (!hasRealKey()) {
    console.log('RAG: Skipping embedding generation (no real OpenAI API key)');
    return texts.map(() => new Array(1536).fill(0)); // Return zero vectors as placeholder
  }
  if (texts.length === 0) return [];
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map(d => d.embedding);
}

/**
 * Process an uploaded course PDF and store Vector Embeddings in MongoDB
 */
async function processAndStoreCoursePDF(courseId, lessonTitle, pdfBuffer) {
  const text = await parsePDFBuffer(pdfBuffer);
  const chunks = chunkText(text);
  
  if (chunks.length === 0) return;

  const embeddings = await generateEmbeddings(chunks);

  // Save each chunk embedding into Local MongoDB
  const docs = chunks.map((chunkText, index) => ({
    courseId,
    lessonTitle,
    chunkIndex: index,
    text: chunkText,
    embedding: embeddings[index]
  }));

  await DocumentEmbedding.insertMany(docs);
  console.log(`Stored ${docs.length} vector embeddings for ${lessonTitle}`);
}

/**
 * Cosine Similarity Math Formula
 * (A * B) / (|A| * |B|)
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Semantic Vector Search against local MongoDB Embeddings
 */
async function searchVectorContext(query, topK = 3) {
  // 1. Convert user's question into an embedding
  const queryEmbeddingRes = await generateEmbeddings([query]);
  const queryEmbedding = queryEmbeddingRes[0];

  // 2. Fetch all document embeddings from DB
  // Notes: In a huge production app, use Pinecone or Mongo Atlas Vector Search index.
  // For standard deployment sizes, calculating cosine locally in memory is 100% fine.
  const allDocs = await DocumentEmbedding.find({});
  
  // 3. Compute similarities
  const scoredDocs = allDocs.map(doc => ({
    text: doc.text,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding),
    lessonTitle: doc.lessonTitle
  }));

  // 4. Sort descending and grab Top K closest matches
  scoredDocs.sort((a, b) => b.similarity - a.similarity);
  return scoredDocs.slice(0, topK);
}

module.exports = {
  processAndStoreCoursePDF,
  searchVectorContext
};
