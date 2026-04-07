const express = require('express');
const { authMiddleware } = require('./auth');
const Progress = require('../models/Progress');
const QuizResult = require('../models/QuizResult');
const User = require('../models/User');

const router = express.Router();

router.use(authMiddleware);

// Utility to get or create progress document
const getProgress = async (userId) => {
  let progress = await Progress.findOne({ userId });
  if (!progress) {
    progress = new Progress({ userId, completedLessons: [], weakAreas: [], strengths: [] });
    await progress.save();
  }
  return progress;
};

// Get current user progress
router.get('/', async (req, res) => {
  try {
    const progress = await getProgress(req.user.id);
    const recentQuizzes = await QuizResult.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(5);
    res.json({ progress, recentQuizzes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching progress' });
  }
});

// Submit a quiz result and update progress
router.post('/quiz-result', async (req, res) => {
  try {
    const { topic, difficulty, score, totalQuestions, questionsAndAnswers } = req.body;
    const userId = req.user.id;

    const quizResult = new QuizResult({
      userId,
      topic,
      difficulty,
      score,
      totalQuestions,
      questionsAndAnswers
    });
    await quizResult.save();

    // Update progress stats based on score
    const progress = await getProgress(userId);
    const percentage = score / totalQuestions;
    
    if (percentage > 0.8) {
      if (!progress.strengths.includes(topic)) progress.strengths.push(topic);
      progress.weakAreas = progress.weakAreas.filter(area => area !== topic); // remove from weak if improved
    } else if (percentage < 0.5) {
      if (!progress.weakAreas.includes(topic)) progress.weakAreas.push(topic);
    }
    
    // Add points to user
    const user = await User.findById(userId);
    const pointsGained = Math.round(percentage * 10 * (difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1));
    user.points += pointsGained;
    
    // Check for badges
    if (user.points >= 100 && !user.badges.includes('Scholar')) {
      user.badges.push('Scholar');
    }
    if (user.points >= 500 && !user.badges.includes('Master')) {
      user.badges.push('Master');
    }

    await user.save();
    
    progress.lastActive = Date.now();
    await progress.save();

    res.json({ message: 'Quiz result saved', newScore: user.points, badges: user.badges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving quiz result' });
  }
});

// Mark lesson completed
router.post('/lesson-complete', async (req, res) => {
  try {
    const { lessonId, title } = req.body;
    const progress = await getProgress(req.user.id);
    
    const alreadyCompleted = progress.completedLessons.find(l => l.lessonId === lessonId);
    if (!alreadyCompleted) {
      progress.completedLessons.push({ lessonId, title, completedAt: Date.now() });
      await progress.save();
    }

    res.json({ message: 'Lesson marked as complete', progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating lesson progress' });
  }
});

// Get all students progress (Instructor & Admin only via RBAC)
const { requireRole } = require('./auth');
router.get('/all', requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('name email points badges');
    const allProgress = await Progress.find().populate('userId', 'name');
    
    res.json({ students, allProgress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

module.exports = router;
