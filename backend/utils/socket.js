import { Server } from 'socket.io';

let io = null;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

    // Join user to their room for personal notifications
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`👤 User ${userId} joined their room`);
    });

    // Join admin to admin room
    socket.on('join-admin-room', () => {
      socket.join('admin-room');
      console.log('👨‍💼 Admin joined admin room');
    });

    // Handle truck location updates
    socket.on('truck-location-update', (data) => {
      // Broadcast to all connected clients
      socket.broadcast.emit('truck-location-updated', data);
    });

    // Handle new messages
    socket.on('new-message', (data) => {
      if (data.recipientType === 'admin') {
        // Send to admin room
        socket.to('admin-room').emit('message-received', data);
      } else {
        // Send to specific user
        socket.to(`user-${data.recipientId}`).emit('message-received', data);
      }
    });

    // Handle pickup requests
    socket.on('new-pickup-request', (data) => {
      // Notify all admins
      socket.to('admin-room').emit('pickup-request-received', data);
    });

    // Handle truck dispatch
    socket.on('truck-dispatched', (data) => {
      // Notify the specific user
      socket.to(`user-${data.userId}`).emit('truck-dispatch-update', data);
    });

    socket.on('disconnect', () => {
      console.log('👤 User disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized! Call initializeSocket first.');
  }
  return io;
};