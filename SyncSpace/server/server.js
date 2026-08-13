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
const roomStates = {};

const createRoomState = () => ({
  lines: [],
  texts: [],
  code:
    '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");',
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // =========================
  // JOIN ROOM
  // =========================

  socket.on("join-room", (data) => {
    const roomId =
      typeof data === "string"
        ? data.trim()
        : data?.roomId?.trim();

    const name =
      typeof data === "object" && data?.name
        ? data.name.trim()
        : `User-${socket.id.slice(0, 4)}`;

    if (!roomId) return;

    if (
      socket.currentRoom &&
      socket.currentRoom !== roomId
    ) {
      const oldRoom = socket.currentRoom;

      socket.leave(oldRoom);

      if (roomUsers[oldRoom]) {
        roomUsers[oldRoom] =
          roomUsers[oldRoom].filter(
            (user) =>
              user.socketId !== socket.id
          );

        io.to(oldRoom).emit(
          "room-users",
          roomUsers[oldRoom]
        );

        if (
          roomUsers[oldRoom].length === 0
        ) {
          delete roomUsers[oldRoom];
        }
      }
    }

    socket.currentRoom = roomId;

    socket.join(roomId);

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

    roomUsers[roomId] =
      roomUsers[roomId].filter(
        (user) =>
          user.socketId !== socket.id
      );

    roomUsers[roomId].push({
      socketId: socket.id,
      name:
        name ||
        `User-${socket.id.slice(0, 4)}`,
    });

    if (!roomStates[roomId]) {
      roomStates[roomId] =
        createRoomState();
    }

    console.log(
      `${name} joined room: ${roomId}`
    );

    io.to(roomId).emit(
      "room-users",
      roomUsers[roomId]
    );

    socket.emit(
      "room-state",
      roomStates[roomId]
    );
  });

  // =========================
  // DRAW LINE
  // =========================

  socket.on("draw-line", (data) => {
    if (
      !data?.roomId ||
      !Array.isArray(data.points)
    ) {
      return;
    }

    const roomId = data.roomId;

    if (!roomStates[roomId]) {
      roomStates[roomId] =
        createRoomState();
    }

    const newLine = {
      id:
        data.id ||
        `${socket.id}-${Date.now()}`,
      points: data.points,
      color:
        data.color || "#2563eb",
      brushSize:
        Number(data.brushSize) || 4,
    };

    roomStates[roomId].lines.push(
      newLine
    );

    socket.to(roomId).emit(
      "draw-line",
      newLine
    );
  });

  // =========================
  // UNDO
  // =========================

  socket.on("undo", (data) => {
    if (!data?.roomId) return;

    const roomId = data.roomId;

    if (!roomStates[roomId]) return;

    const lines =
      roomStates[roomId].lines;

    if (lines.length === 0) return;

    const removedLine =
      lines.pop();

    io.to(roomId).emit(
      "undo",
      {
        line: removedLine,
      }
    );
  });

  // =========================
  // REDO
  // =========================

  socket.on("redo", (data) => {
    if (
      !data?.roomId ||
      !data.line
    ) {
      return;
    }

    const roomId = data.roomId;

    if (!roomStates[roomId]) {
      roomStates[roomId] =
        createRoomState();
    }

    roomStates[roomId].lines.push(
      data.line
    );

    io.to(roomId).emit(
      "redo",
      {
        line: data.line,
      }
    );
  });

  // =========================
  // ERASE LINE
  // =========================

  socket.on("erase-line", (data) => {
    if (
      !data?.roomId ||
      !data.lineId
    ) {
      return;
    }

    const roomId = data.roomId;

    if (!roomStates[roomId]) return;

    const index =
      roomStates[roomId].lines.findIndex(
        (line) =>
          line.id === data.lineId
      );

    if (index === -1) return;

    const removedLine =
      roomStates[roomId].lines.splice(
        index,
        1
      )[0];

    io.to(roomId).emit(
      "erase-line",
      {
        lineId: data.lineId,
        line: removedLine,
      }
    );
  });

  // =========================
  // ADD TEXT
  // =========================

  socket.on("add-text", (data) => {
    if (
      !data?.roomId ||
      !data?.text
    ) {
      return;
    }

    const roomId = data.roomId;
    const text = data.text;

    if (!roomStates[roomId]) {
      roomStates[roomId] =
        createRoomState();
    }

    const exists =
      roomStates[roomId].texts.some(
        (item) =>
          item.id === text.id
      );

    if (!exists) {
      roomStates[roomId].texts.push(
        text
      );
    }

    socket.to(roomId).emit(
      "add-text",
      {
        text,
      }
    );
  });

  // =========================
  // DELETE TEXT
  // =========================

  socket.on("delete-text", (data) => {
    if (
      !data?.roomId ||
      !data.textId
    ) {
      return;
    }

    const roomId = data.roomId;

    if (!roomStates[roomId]) return;

    roomStates[roomId].texts =
      roomStates[roomId].texts.filter(
        (text) =>
          text.id !== data.textId
      );

    io.to(roomId).emit(
      "delete-text",
      {
        textId: data.textId,
      }
    );
  });

  // =========================
  // CLEAR BOARD
  // =========================

  socket.on("clear-board", (roomId) => {
    if (!roomId) return;

    if (!roomStates[roomId]) return;

    roomStates[roomId].lines = [];
    roomStates[roomId].texts = [];

    io.to(roomId).emit(
      "clear-board"
    );
  });

  // =========================
  // CODE
  // =========================

  socket.on("code-change", (data) => {
    if (!data?.roomId) return;

    const roomId = data.roomId;

    if (!roomStates[roomId]) {
      roomStates[roomId] =
        createRoomState();
    }

    const newCode =
      typeof data.code === "string"
        ? data.code
        : "";

    roomStates[roomId].code =
      newCode;

    socket.to(roomId).emit(
      "code-update",
      {
        code: newCode,
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

    const roomId = data.roomId;

    const user =
      roomUsers[roomId]?.find(
        (member) =>
          member.socketId === socket.id
      );

    const userName = user
      ? user.name
      : `User-${socket.id.slice(0, 4)}`;

    io.to(roomId).emit(
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

    const roomId =
      socket.currentRoom;

    if (!roomId) return;

    if (roomUsers[roomId]) {
      roomUsers[roomId] =
        roomUsers[roomId].filter(
          (user) =>
            user.socketId !== socket.id
        );

      io.to(roomId).emit(
        "room-users",
        roomUsers[roomId]
      );

      if (
        roomUsers[roomId].length === 0
      ) {
        delete roomUsers[roomId];
      }
    }

    socket.currentRoom = null;
  });
});

server.listen(5000, () => {
  console.log(
    "🚀 SyncSpace Server running on port 5000"
  );
});