const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key', // This is unsafe for prod, but we'll protect endpoints.
});

/**
 * Generate a chat response using OpenAI
 * @param {Array} messages - Recent chat history messages
 * @param {string} ragContext - Optional RAG context from vector search to inject into system prompt
 */
const generateChatResponse = async (messages, ragContext = '') => {
  const basePrompt = "You are a helpful, encouraging AI learning assistant for NUUR TECH e-learning platform. Explain concepts simply and effectively.";
  const systemPrompt = ragContext
    ? `${basePrompt}\n\nHere is proprietary context from the instructor's uploaded course materials. Use this to answer the student's question accurately:\n${ragContext}`
    : basePrompt;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI Chat Error:", error);
    throw error;
  }
};

/**
 * Generate a quiz based on topic
 */
const generateQuiz = async (topic, difficulty) => {
  try {
    const prompt = `Generate a ${difficulty} 3-question multiple choice quiz about "${topic}".
    Return ONLY a valid JSON array of objects, where each object has:
    "question" (string), "options" (array of strings), "correctAnswer" (string), "explanation" (string).`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    // Safety check parsing
    const content = completion.choices[0].message.content;
    try {
      const parsed = JSON.parse(content);
      // If it's a wrapper object like { "quiz": [...] }, unwrap it
      return parsed.quiz || parsed;
    } catch(e) {
      return { error: 'Failed to parse AI response into JSON', raw: content };
    }
  } catch (error) {
    console.error("OpenAI Quiz Error:", error);
    throw error;
  }
};

/**
 * Summarize lesson text
 */
const summarizeLesson = async (text) => {
  try {
    const prompt = `Summarize the following lesson content into key bullet points and extract 3 key concepts:\n\n${text}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI Summary Error:", error);
    throw error;
  }
};

module.exports = {
  generateChatResponse,
  generateQuiz,
  summarizeLesson
};
