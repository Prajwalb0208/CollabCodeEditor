// src/Socket.js
import { io } from 'socket.io-client';

// Create a socket instance
const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', {
  autoConnect: false, // We'll connect manually when needed
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Export singleton socket instance
export default socket;

// Helper function for initializing socket
export const initSocket = () => {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve(socket);
      return;
    }

    socket.connect();
    
    socket.on('connect', () => {
      console.log('Socket connected successfully');
      resolve(socket);
    });
    
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      reject(err);
    });
  });
};