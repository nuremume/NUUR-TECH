const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Import S3 integration instead of using local disk storage
const { upload, uploadToS3 } = require('../services/s3Service');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_key', {
    expiresIn: '30d',
  });
};

// @route POST /api/auth/register-student
router.post('/register-student', catchAsync(async (req, res, next) => {
  const { fullName, username, phone, email, password, dob } = req.body;

  // Backend Validation
  if (!fullName || !username || !phone || !email || !password || !dob) {
    return next(new AppError('All fields are strictly required.', 400));
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return next(new AppError('Invalid email syntax.', 400));
  if (password.length < 6) return next(new AppError('Password must be safely over 6 characters.', 400));

  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    return next(new AppError('User with this email or username already exists', 400));
  }

  const user = await User.create({
    fullName, username, phone, email, password, dob, role: 'student'
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      nuurId: user.nuurId,
      role: user.role,
      token: generateToken(user._id)
    });
  } else {
    return next(new AppError('Invalid user data', 400));
  }
}));

// @route POST /api/auth/register-instructor
router.post('/register-instructor', upload.fields([{ name: 'cvFile', maxCount: 1 }, { name: 'educationDoc', maxCount: 1 }]), catchAsync(async (req, res, next) => {
  const { fullName, username, phone, email, password, dob } = req.body;
  
  // Backend Validation
  if (!fullName || !username || !phone || !email || !password || !dob) {
    return next(new AppError('All fields are strictly required for validation.', 400));
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return next(new AppError('Invalid email syntax.', 400));
  if (password.length < 6) return next(new AppError('Password must be safely over 6 characters.', 400));
  
  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    return next(new AppError('Instructor with this email or username already exists', 400));
  }

  let cvFilePath = '';
  let educationDocPath = '';

  // Route to S3 if files are present in the buffer
  if (req.files && req.files['cvFile']) {
    const cvFile = req.files['cvFile'][0];
    cvFilePath = await uploadToS3(cvFile.buffer, cvFile.originalname, cvFile.mimetype);
  }

  if (req.files && req.files['educationDoc']) {
    const eduFile = req.files['educationDoc'][0];
    educationDocPath = await uploadToS3(eduFile.buffer, eduFile.originalname, eduFile.mimetype);
  }

  const user = await User.create({
    fullName, username, phone, email, password, dob, role: 'instructor', 
    cvFile: cvFilePath, educationDoc: educationDocPath
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      nuurId: user.nuurId,
      role: user.role,
      isApproved: user.isApproved,
      message: 'Registration successful. Pending Admin Approval.'
    });
  } else {
    return next(new AppError('Invalid instructor data', 400));
  }
}));

// @route POST /api/auth/login
router.post('/login', catchAsync(async (req, res, next) => {
  const { identifier, password } = req.body; // identifier can be username, email, or phone

  const user = await User.findOne({ 
    $or: [{ email: identifier }, { username: identifier }, { phone: identifier }] 
  });

  if (user && (await user.comparePassword(password))) {
    res.json({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      nuurId: user.nuurId,
      isApproved: user.isApproved,
      token: generateToken(user._id)
    });
  } else {
    return next(new AppError('Invalid credentials', 401));
  }
}));

module.exports = { router };
