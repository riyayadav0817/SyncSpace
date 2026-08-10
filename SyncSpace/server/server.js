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

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join collaboration room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  // Real-time whiteboard drawing
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

  // Real-time code editor
  socket.on("code-change", (data) => {
    socket.to(data.roomId).emit("code-update", {
      code: data.code,
    });
  });

  // User disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});