const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("SyncSpace Server Running");
});

const roomUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join collaboration room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

    roomUsers[roomId].push({
      socketId: socket.id,
      name: `User-${socket.id.slice(0, 4)}`,
    });

    console.log(`User ${socket.id} joined room: ${roomId}`);

    io.to(roomId).emit("room-users", roomUsers[roomId]);
  });

  // Whiteboard drawing
  socket.on("draw-line", (data) => {
    socket.to(data.roomId).emit("draw-line", {
      points: data.points,
      color: data.color,
      brushSize: data.brushSize,
    });
  });

  // Clear whiteboard
  socket.on("clear-board", (roomId) => {
    socket.to(roomId).emit("clear-board");
  });

  // Code editor
  socket.on("code-change", (data) => {
    socket.to(data.roomId).emit("code-update", {
      code: data.code,
    });
  });

  // Real-time chat
  socket.on("chat-message", (data) => {
    const user = roomUsers[data.roomId]?.find(
      (member) => member.socketId === socket.id
    );

    const userName = user
      ? user.name
      : `User-${socket.id.slice(0, 4)}`;

    io.to(data.roomId).emit("chat-message", {
      user: userName,
      message: data.message,
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (const roomId in roomUsers) {
      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.socketId !== socket.id
      );

      io.to(roomId).emit("room-users", roomUsers[roomId]);

      if (roomUsers[roomId].length === 0) {
        delete roomUsers[roomId];
      }
    }
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});