const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { protect, instructorOnly } = require('../middleware/authMiddleware');

// @route POST /api/courses
// Create a new course
router.post('/', protect, instructorOnly, async (req, res) => {
  try {
    const { title, description } = req.body;
    const course = new Course({
      title,
      description,
      instructor: req.user._id
    });
    
    const createdCourse = await course.save();
    res.status(201).json(createdCourse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET /api/courses
// Get all courses (public or user specific logic)
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true }).populate('instructor', 'fullName nuurId');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin and Instructor features can be extended here
module.exports = router;
