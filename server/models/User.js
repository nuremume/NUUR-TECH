const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Counter = require('./Counter');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dob: { type: String, required: true }, // or Date
  role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },
  nuurId: { type: String, unique: true }, // Format: XXXX/YY
  
  // Instructor specific fields
  cvFile: { type: String }, // Path or URL to file
  educationDoc: { type: String }, // Path or URL to file
  isApproved: { type: Boolean, default: function() {
    return this.role === 'instructor' ? false : true;
  }},
}, { timestamps: true });

// Pre-save hook to hash password and generate nuurId
userSchema.pre('save', async function (next) {
  // Hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Generate nuurId if new and not admin (admin doesn't necessarily need XXXX/YY but we can assign it if needed)
  if (this.isNew && (this.role === 'student' || this.role === 'instructor')) {
    const currentYear = new Date().getFullYear().toString().slice(-2); // e.g. "26"
    
    // Find counter for the current year
    const counter = await Counter.findOneAndUpdate(
      { year: currentYear },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    
    // Pad sequence to at least 4 digits
    const seqStr = counter.seq.toString().padStart(4, '0');
    this.nuurId = `${seqStr}/${currentYear}`;
  }

  next();
});

// Method to verify password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
