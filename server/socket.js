const socketIo = require('socket.io');

function initSocket(server) {
  // Initialize socket.io with CORS allowing our frontend
  const io = socketIo(server, {
    cors: {
      origin: "*", // allow all in dev, restrict to vercel URL in prod
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`New WebSocket Connection: ${socket.id}`);

    // Join a specific study room
    socket.on('join-room', (roomId, username) => {
      socket.join(roomId);
      console.log(`User ${username} (${socket.id}) joined room ${roomId}`);
      
      // Notify the room
      socket.to(roomId).emit('user-joined', { username, timestamp: new Date() });
    });

    // Handle incoming broadcast messages
    socket.on('send-message', (roomId, data) => {
      // Forward the message to everyone else in the room
      socket.to(roomId).emit('receive-message', {
        username: data.username,
        text: data.text,
        timestamp: new Date()
      });
    });

    // Identify when a peer disconnects
    socket.on('disconnect', () => {
      console.log(`WebSocket Disconnected: ${socket.id}`);
      // A more robust implementation would map socket.id to usernames and room IDs
      // to broadcast a 'user-left' event
    });
  });

  return io;
}

module.exports = { initSocket };
