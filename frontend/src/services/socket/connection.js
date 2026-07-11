import { io } from "socket.io-client";
import { useAuthStore } from "../../stores/authStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

export const getSocket = () => {
  return socket;
};

export const connectSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore.getState();

  if (!isAuthenticated || !accessToken) {
    disconnectSocket();
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: accessToken,
    },
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("WebSocket connected successfully: ID =", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("WebSocket disconnected. Reason:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("WebSocket connection handshake failed:", error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("WebSocket connection terminated.");
  }
};
