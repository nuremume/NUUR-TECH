const express = require('express');
const { authMiddleware, requireRole } = require('./auth');
const Course = require('../models/Course');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(['instructor', 'admin'])); // Protect entire file

// Create a new course
router.post('/courses', catchAsync(async (req, res, next) => {
  const { title, description, tags, isPublished } = req.body;
  
  const course = new Course({
    title,
    description,
    tags,
    isPublished: isPublished || false,
    instructorId: req.user.id
  });
  
  await course.save();
  res.status(201).json(course);
}));

// Get all courses by logged in instructor
router.get('/courses/me', catchAsync(async (req, res, next) => {
  const courses = await Course.find({ instructorId: req.user.id });
  res.json(courses);
}));

const { upload, uploadToS3 } = require('../services/s3Service');
const { processAndStoreCoursePDF } = require('../services/ragService');

// Add a lesson to a course (Now supports media upload)
router.post('/courses/:courseId/lessons', upload.single('mediaFile'), catchAsync(async (req, res, next) => {
  const { title, content, duration } = req.body;
  let videoUrl = req.body.videoUrl; // Optional manual link
  
  const course = await Course.findOne({ _id: req.params.courseId, instructorId: req.user.id });
  if (!course) return next(new AppError('Course not found or unauthorized', 404));
  
  // If a media file was directly uploaded in the formdata
  if (req.file) {
    // If it's a PDF document, inject it into the AI Vector Space (RAG)
    if (req.file.mimetype === 'application/pdf') {
      processAndStoreCoursePDF(course._id, title, req.file.buffer).catch(err => {
        console.error("Vector Storage Background Process failed:", err);
      });
    }
    
    // Upload raw file to S3 as well
    videoUrl = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype);
  }
  
  course.lessons.push({ title, content, videoUrl, duration });
  await course.save();
  res.status(201).json({ message: 'Lesson added successfully', course, uploadedUrl: videoUrl });
}));

module.exports = router;
