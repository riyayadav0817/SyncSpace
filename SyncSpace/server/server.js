const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5174",
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

    // Tell other users that someone joined
    socket.to(roomId).emit("user-joined", socket.id);
  });

  // Receive drawing from a user
  socket.on("draw-line", (data) => {
    const { roomId } = data;

    // Send drawing to everyone else in the same room
    socket.to(roomId).emit("draw-line", data);
  });

  // Clear whiteboard
  socket.on("clear-board", (roomId) => {
    socket.to(roomId).emit("clear-board");
  });

  // User disconnected
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});