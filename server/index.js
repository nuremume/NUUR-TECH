require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://nuur-tech.vercel.app',
  'https://client-five-swart-28.vercel.app', // Added new deployment URL
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Dynamically allow any origin (especially needed since Vercel previews have dynamic URLs)
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Database connection
async function connectDB() {
  try {
    // If you are deploying, use process.env.MONGO_URI
    let uri = process.env.MONGO_URI || 'mongodb://localhost:27017/nuurtech_ai';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`\x1b[32m[DB] Connected firmly to MongoDB at ${uri}\x1b[0m`);
  } catch (err) {
    console.error('\x1b[31m[DB] MongoDB connection error:\x1b[0m', err.message);
    console.log('\x1b[33m\nMake sure your MongoDB instance is actively running! (e.g. `mongod` or `net start MongoDB`)\x1b[0m');
  }
}

connectDB();

// Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/ai', require('./routes/ai'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/instructor', require('./routes/instructor'));

app.get('/', (req, res) => {
  res.send('NUUR TECH AI Learning Assistant API is running');
});

const http = require('http');
const { initSocket } = require('./socket');

const server = http.createServer(app);

// Attach Socket.io to the HTTP server
initSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server and WebSockets running on http://localhost:${PORT}`);
});
