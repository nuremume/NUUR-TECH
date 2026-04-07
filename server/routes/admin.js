const express = require('express');
const { authMiddleware, requireRole } = require('./auth');
const User = require('../models/User');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(['admin'])); // Protect entire file

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Approve/Reject User
router.put('/users/:id/approve', async (req, res) => {
  try {
    const { isApproved } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.isApproved = isApproved;
    await user.save();
    
    // Only send an email if they were just approved and they are an instructor
    if (isApproved === true && user.role === 'instructor') {
      const emailService = require('../services/emailService');
      await emailService.sendAccountApprovalEmail(user.email, user.name);
    }
    
    res.json({ message: `User approval set to ${isApproved}`, user });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
