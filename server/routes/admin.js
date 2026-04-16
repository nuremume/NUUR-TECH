const express = require('express');
const router = express.Router();
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// @route GET /api/admin/users
router.get('/users', protect, adminOnly, catchAsync(async (req, res, next) => {
  const users = await User.find({}).select('-password');
  res.json(users);
}));

// @route PUT /api/admin/instructors/:id/approve
router.put('/instructors/:id/approve', protect, adminOnly, catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (user && user.role === 'instructor') {
    user.isApproved = true;
    await user.save();
    res.json({ message: 'Instructor approved successfully', user });
  } else {
    return next(new AppError('Instructor not found', 404));
  }
}));

module.exports = router;
