const mongoose = require('mongoose');

const documentEmbeddingSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonTitle: { type: String, required: true },
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true }, // The 1536-dimensional array from OpenAI text-embedding-3-small
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DocumentEmbedding', documentEmbeddingSchema);
