const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nuurtech_ai';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});

    // Create Admin
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const admin = new User({
      name: 'Admin User',
      email: 'admin@nuur.tech',
      password: adminPassword,
      role: 'admin',
      isApproved: true
    });
    await admin.save();

    // Create Instructor
    const instructorPassword = await bcrypt.hash('instructor123', salt);
    const instructor = new User({
      name: 'Dr. Tech',
      email: 'instructor@nuur.tech',
      password: instructorPassword,
      role: 'instructor',
      isApproved: true
    });
    await instructor.save();

    // Create Student
    const studentPassword = await bcrypt.hash('student123', salt);
    const student = new User({
      name: 'Student One',
      email: 'student@nuur.tech',
      password: studentPassword,
      role: 'student',
      isApproved: true,
      points: 50
    });
    await student.save();

    // Create Sample Courses
    const courses = [
      {
        title: 'JavaScript Mastery',
        description: 'Deep dive into modern JS from zero to hero.',
        instructorId: instructor._id,
        difficulty: 'medium',
        lessons: [
          { title: 'Introduction', content: 'Welcome to JS Mastery.' },
          { title: 'Asynchronous Programming', content: 'Lessons on Promises and Async/Await.' }
        ]
      },
      {
        title: 'Advanced React',
        description: 'Master hooks, patterns, and state management.',
        instructorId: instructor._id,
        difficulty: 'hard',
        lessons: [
          { title: 'Hooks deep dive', content: 'Exploring useEffect and useMemo.' }
        ]
      }
    ];

    await Course.insertMany(courses);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
