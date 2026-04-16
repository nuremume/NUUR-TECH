const express = require('express');
const { authMiddleware } = require('./auth');
const ChatHistory = require('../models/ChatHistory');
const { generateChatResponse, generateQuiz, summarizeLesson } = require('../services/openaiService');
const { searchVectorContext } = require('../services/ragService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const router = express.Router();

// Middleware to use auth
router.use(authMiddleware);

// --- Chat Endpoint (RAG-Enhanced) ---
router.post('/chat', catchAsync(async (req, res, next) => {
  const { message, topic } = req.body;
  const userId = req.user.id;

  // Find or create chat history for this user
  let chatHistory = await ChatHistory.findOne({ userId, topic: topic || 'General Tutoring' });
  
  if (!chatHistory) {
    chatHistory = new ChatHistory({
      userId,
      topic: topic || 'General Tutoring',
      messages: []
    });
  }

  // Add user message
  chatHistory.messages.push({ role: 'user', content: message });

  // 1. RAG: Search local vector embeddings for relevant course context
  let ragContext = '';
  try {
    const contextDocs = await searchVectorContext(message, 3);
    if (contextDocs.length > 0) {
      ragContext = contextDocs
        .map(doc => `[From "${doc.lessonTitle}" | Relevance: ${(doc.similarity * 100).toFixed(1)}%]\n${doc.text}`)
        .join('\n\n---\n\n');
      console.log(`RAG: Injected ${contextDocs.length} context chunks into AI prompt`);
    }
  } catch (ragErr) {
    // RAG is non-blocking - if it fails, we still answer without context
    console.error('RAG search failed (non-blocking):', ragErr.message);
  }

  // 2. Prepare messages for OpenAI (only send last 10 messages for context window management)
  const recentMessages = chatHistory.messages.slice(-10).map(m => ({
    role: m.role,
    content: m.content
  }));

  // 3. Get AI response with optional RAG context
  const aiResponseContent = await generateChatResponse(recentMessages, ragContext);

  // Add AI message to history
  chatHistory.messages.push({ role: 'assistant', content: aiResponseContent });
  
  // Save history
  chatHistory.updatedAt = Date.now();
  await chatHistory.save();

  res.json({ response: aiResponseContent, historyId: chatHistory._id, ragContextUsed: ragContext.length > 0 });
}));

// --- Quiz Endpoint ---
router.post('/quiz', catchAsync(async (req, res, next) => {
  const { topic, difficulty } = req.body;
  
  if (!topic) return next(new AppError('Topic is required', 400));

  const quizData = await generateQuiz(topic, difficulty || 'medium');
  res.json(quizData);
}));

// --- Summarize Endpoint ---
router.post('/summarize', catchAsync(async (req, res, next) => {
  const { text } = req.body;
  
  if (!text) return next(new AppError('Text is required for summarization', 400));

  const summary = await summarizeLesson(text);
  res.json({ summary });
}));

module.exports = router;
