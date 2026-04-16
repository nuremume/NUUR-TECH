const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { protect, instructorOnly } = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// @route POST /api/courses
// Create a new course
router.post('/', protect, instructorOnly, catchAsync(async (req, res, next) => {
  const { title, description } = req.body;
  if (!title) {
    return next(new AppError('Course title is required', 400));
  }
  const course = new Course({
    title,
    description,
    instructor: req.user._id
  });
  
  const createdCourse = await course.save();
  res.status(201).json(createdCourse);
}));

// @route GET /api/courses
// Get all courses (public or user specific logic)
router.get('/', catchAsync(async (req, res, next) => {
  const courses = await Course.find({ isPublished: true }).populate('instructor', 'fullName nuurId');
  res.json(courses);
}));

// Admin and Instructor features can be extended here
module.exports = router;
