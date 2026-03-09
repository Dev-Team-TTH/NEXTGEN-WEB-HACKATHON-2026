import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket.io] 🟢 Client connected: ${socket.id}`);

    // Có thể setup các room riêng biệt (ví dụ: room cho Admin, room cho chi nhánh A...)
    socket.on("join_room", (roomName) => {
      socket.join(roomName);
      console.log(`[Socket.io] Client ${socket.id} joined room: ${roomName}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] 🔴 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io chưa được khởi tạo!");
  }
  return io;
};