const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  studentName: { type: String },
  instructorName: { type: String },
  courseName: { type: String },
  type: { type: String, enum: ['enrollment', 'completion'], required: true },
  certificateId: { type: String, unique: true } // Unique crypto ID or generated sequence
}, { timestamps: true });

certificateSchema.pre('save', function (next) {
  if (this.isNew && !this.certificateId) {
    // Generate a random ID e.g. CERT-XXXXXX
    const randomHex = require('crypto').randomBytes(4).toString('hex').toUpperCase();
    this.certificateId = `CERT-${randomHex}`;
  }
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
