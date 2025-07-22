// Socket.IO client configuration for real-time updates
import { io } from "socket.io-client";

// Create socket connection to the server
export const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000,
  transports: ['websocket', 'polling']
});

// Socket event listeners for debugging
socket.on('connect', () => {
  console.log('WebSocket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('WebSocket disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
});

// Export helper functions for common operations
export const joinProject = (projectId) => {
  socket.emit('join-project', projectId);
};

export const leaveProject = (projectId) => {
  socket.emit('leave-project', projectId);
};

export const emitTeamUpdate = (data) => {
  socket.emit('team-update', data);
};

export const emitIncidentUpdate = (data) => {
  socket.emit('incident-update', data);
};