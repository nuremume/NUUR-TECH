const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedLessons: [{
    lessonId: String,
    title: String,
    completedAt: Date
  }],
  weakAreas: [{ type: String }],
  strengths: [{ type: String }],
  studyStreakDays: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Progress', progressSchema);
