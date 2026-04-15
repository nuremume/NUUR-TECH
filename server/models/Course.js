const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentsEnrolled: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  materials: [{
    title: { type: String },
    type: { type: String, enum: ['video', 'document', 'assignment'] },
    url: { type: String } // Path to file or video link
  }],
  liveSessions: [{
    title: { type: String },
    date: { type: Date },
    link: { type: String } // Integration ready link
  }],
  isPublished: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
