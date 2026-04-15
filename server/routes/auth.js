const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');

// Setup Multer for file uploads (docs & CVs)
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_key', {
    expiresIn: '30d',
  });
};

// @route POST /api/auth/register-student
router.post('/register-student', async (req, res) => {
  try {
    const { fullName, username, phone, email, password, dob } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
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
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/auth/register-instructor
router.post('/register-instructor', upload.fields([{ name: 'cvFile', maxCount: 1 }, { name: 'educationDoc', maxCount: 1 }]), async (req, res) => {
  try {
    const { fullName, username, phone, email, password, dob } = req.body;
    
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'Instructor with this email or username already exists' });
    }

    const cvFilePath = req.files && req.files['cvFile'] ? req.files['cvFile'][0].path : '';
    const educationDocPath = req.files && req.files['educationDoc'] ? req.files['educationDoc'][0].path : '';

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
      res.status(400).json({ message: 'Invalid instructor data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
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
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = { router };
