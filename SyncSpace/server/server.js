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

// =========================
// ROOM DATA
// =========================

const roomUsers = {};
const roomStates = {};

// =========================
// SOCKET CONNECTION
// =========================

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // =========================
  // JOIN ROOM
  // =========================

  socket.on("join-room", (roomId) => {
    if (!roomId) return;

    socket.join(roomId);

    // Create users list
    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

    // Prevent duplicate user
    const alreadyJoined = roomUsers[roomId].some(
      (user) => user.socketId === socket.id
    );

    if (!alreadyJoined) {
      roomUsers[roomId].push({
        socketId: socket.id,
        name: `User-${socket.id.slice(0, 4)}`,
      });
    }

    // Create room state
    if (!roomStates[roomId]) {
      roomStates[roomId] = {
        lines: [],
        texts: [],
        code:
          '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");',
      };
    }

    console.log(
      `User ${socket.id} joined room: ${roomId}`
    );

    // Send updated users to everyone
    io.to(roomId).emit(
      "room-users",
      roomUsers[roomId]
    );

    // Send existing room state ONLY to new user
    socket.emit(
      "room-state",
      roomStates[roomId]
    );
  });

  // =========================
  // WHITEBOARD - DRAW LINE
  // =========================

  socket.on("draw-line", (data) => {
    if (!data?.roomId) return;

    if (!roomStates[data.roomId]) {
      roomStates[data.roomId] = {
        lines: [],
        texts: [],
        code: "",
      };
    }

    const newLine = {
      points: data.points,
      color: data.color,
      brushSize: data.brushSize,
    };

    // Save line on server
    roomStates[data.roomId].lines.push(newLine);

    // Send to other users
    socket.to(data.roomId).emit(
      "draw-line",
      newLine
    );
  });

  // =========================
  // WHITEBOARD - ADD TEXT
  // =========================

  socket.on("add-text", (data) => {
    if (!data?.roomId || !data?.text) {
      return;
    }

    if (!roomStates[data.roomId]) {
      roomStates[data.roomId] = {
        lines: [],
        texts: [],
        code: "",
      };
    }

    // Save text on server
    roomStates[data.roomId].texts.push(
      data.text
    );

    // Send to other users
    socket.to(data.roomId).emit(
      "add-text",
      {
        text: data.text,
      }
    );
  });

  // =========================
  // WHITEBOARD - DELETE TEXT
  // =========================

  socket.on("delete-text", (data) => {
    if (
      !data?.roomId ||
      !data?.textId
    ) {
      return;
    }

    if (roomStates[data.roomId]) {
      roomStates[data.roomId].texts =
        roomStates[data.roomId].texts.filter(
          (text) =>
            text.id !== data.textId
        );
    }

    // Notify other users
    socket.to(data.roomId).emit(
      "delete-text",
      {
        textId: data.textId,
      }
    );
  });

  // =========================
  // WHITEBOARD - ERASE LINE
  // =========================

  socket.on("erase-line", (data) => {
    if (
      !data?.roomId ||
      typeof data.lineIndex !== "number"
    ) {
      return;
    }

    if (roomStates[data.roomId]) {
      roomStates[data.roomId].lines =
        roomStates[data.roomId].lines.filter(
          (_, index) =>
            index !== data.lineIndex
        );
    }

    // Notify other users
    socket.to(data.roomId).emit(
      "erase-line",
      {
        lineIndex: data.lineIndex,
      }
    );
  });

  // =========================
  // WHITEBOARD - CLEAR
  // =========================

  socket.on("clear-board", (roomId) => {
    if (!roomId) return;

    if (roomStates[roomId]) {
      roomStates[roomId].lines = [];
      roomStates[roomId].texts = [];
    }

    // Notify other users
    socket.to(roomId).emit(
      "clear-board"
    );
  });

  // =========================
  // CODE EDITOR
  // =========================

  socket.on("code-change", (data) => {
    if (!data?.roomId) return;

    if (!roomStates[data.roomId]) {
      roomStates[data.roomId] = {
        lines: [],
        texts: [],
        code: "",
      };
    }

    // Save latest code
    roomStates[data.roomId].code =
      data.code;

    // Send to other users
    socket.to(data.roomId).emit(
      "code-update",
      {
        code: data.code,
      }
    );
  });

  // =========================
  // CHAT
  // =========================

  socket.on("chat-message", (data) => {
    if (
      !data?.roomId ||
      !data?.message
    ) {
      return;
    }

    const user =
      roomUsers[data.roomId]?.find(
        (member) =>
          member.socketId === socket.id
      );

    const userName = user
      ? user.name
      : `User-${socket.id.slice(0, 4)}`;

    io.to(data.roomId).emit(
      "chat-message",
      {
        user: userName,
        message: data.message,
      }
    );
  });

  // =========================
  // DISCONNECT
  // =========================

  socket.on("disconnect", () => {
    console.log(
      "User disconnected:",
      socket.id
    );

    for (const roomId in roomUsers) {
      // Remove user
      roomUsers[roomId] =
        roomUsers[roomId].filter(
          (user) =>
            user.socketId !== socket.id
        );

      // Update participants
      io.to(roomId).emit(
        "room-users",
        roomUsers[roomId]
      );

      // Delete empty room users
      if (
        roomUsers[roomId].length === 0
      ) {
        delete roomUsers[roomId];

        // Delete room state also
        delete roomStates[roomId];
      }
    }
  });
});

// =========================
// START SERVER
// =========================

server.listen(5000, () => {
  console.log(
    "Server running on port 5000"
  );
});