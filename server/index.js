require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({ origin: '*', credentials: true })); // In production, restrict origin
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files statically

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Database connection
const { MongoMemoryServer } = require('mongodb-memory-server');

async function connectDB() {
  try {
    let uri = process.env.MONGO_URI;
    if (uri && uri.includes('localhost')) {
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      console.log(`[DB] Spinning up local Memory Server...`);
    }
    await mongoose.connect(uri);
    console.log(`[DB] Connected to MongoDB at ${uri}`);
  } catch (err) {
    console.error('[DB] Connection error:', err.message);
  }
}
connectDB();

// Routes
const authRoutes = require('./routes/auth').router;
const courseRoutes = require('./routes/course');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('NUUR TECH Backend API is running');
});

const server = http.createServer(app);

// Simple init Socket for future expansion
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
