const express = require('express');
const { authMiddleware } = require('./auth');
const ChatHistory = require('../models/ChatHistory');
const { generateChatResponse, generateQuiz, summarizeLesson } = require('../services/openaiService');
const { searchVectorContext } = require('../services/ragService');

const router = express.Router();

// Middleware to use auth
router.use(authMiddleware);

// --- Chat Endpoint (RAG-Enhanced) ---
router.post('/chat', async (req, res) => {
  const { message, topic } = req.body;
  const userId = req.user.id;

  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing chat request' });
  }
});

// --- Quiz Endpoint ---
router.post('/quiz', async (req, res) => {
  const { topic, difficulty } = req.body;
  
  if (!topic) return res.status(400).json({ message: 'Topic is required' });

  try {
    const quizData = await generateQuiz(topic, difficulty || 'medium');
    res.json(quizData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error generating quiz' });
  }
});

// --- Summarize Endpoint ---
router.post('/summarize', async (req, res) => {
  const { text } = req.body;
  
  if (!text) return res.status(400).json({ message: 'Text is required for summarization' });

  try {
    const summary = await summarizeLesson(text);
    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error summarizing lesson' });
  }
});

module.exports = router;
