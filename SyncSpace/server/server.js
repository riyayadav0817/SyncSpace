require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const Workspace = require("./models/Workspace");
const authRoutes = require("./routes/auth");

const app = express();

/* =====================================================
   CONFIG
===================================================== */

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];

/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);

/* =====================================================
   HTTP SERVER
===================================================== */

const server = http.createServer(app);

/* =====================================================
   SOCKET.IO
===================================================== */

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

/* =====================================================
   BASIC ROUTES
===================================================== */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SyncSpace Server Running 🚀",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    server: "online",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

/* =====================================================
   MEMORY
===================================================== */

const roomUsers = {};
const roomStates = {};
const saveTimers = {};

const DEFAULT_CODE =
  '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");';

/* =====================================================
   CREATE ROOM STATE
===================================================== */

const createRoomState = () => ({
  lines: [],
  texts: [],
  code: DEFAULT_CODE,
  language: "javascript",
  redoLines: [],
});

/* =====================================================
   NORMALIZE LINE
===================================================== */

const normalizeLine = (line) => {
  if (!line) return null;

  const points = Array.isArray(line.points)
    ? line.points
        .map((point) => ({
          x: Number(point?.x) || 0,
          y: Number(point?.y) || 0,
        }))
        .filter(
          (point) =>
            Number.isFinite(point.x) &&
            Number.isFinite(point.y),
        )
    : [];

  if (points.length === 0) {
    return null;
  }

  return {
    id:
      String(
        line.id ||
          `line-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
      ),

    type:
      typeof line.type === "string"
        ? line.type
        : typeof line.tool === "string"
          ? line.tool
          : "pen",

    tool:
      typeof line.tool === "string"
        ? line.tool
        : "pen",

    points,

    color:
      typeof line.color === "string"
        ? line.color
        : "#2563eb",

    brushSize:
      Number(line.brushSize) || 4,

    socketId:
      typeof line.socketId === "string"
        ? line.socketId
        : "",
  };
};

/* =====================================================
   GET USER NAME
===================================================== */

const getUserName = (socket, roomId) => {
  const user = roomUsers[roomId]?.find(
    (member) =>
      member.socketId === socket.id,
  );

  return (
    user?.name ||
    `User-${socket.id.slice(0, 4)}`
  );
};

/* =====================================================
   BROADCAST USERS
===================================================== */

const broadcastRoomUsers = (roomId) => {
  io.to(roomId).emit(
    "room-users",
    roomUsers[roomId] || [],
  );
};

/* =====================================================
   LOAD WORKSPACE
===================================================== */

const loadWorkspace = async (roomId) => {
  try {
    const workspace =
      await Workspace.findOne({
        roomId,
      }).lean();

    if (!workspace) {
      return createRoomState();
    }

    const lines = Array.isArray(
      workspace.lines,
    )
      ? workspace.lines
          .map(normalizeLine)
          .filter(Boolean)
      : [];

    return {
      lines,

      texts: [],

      code:
        typeof workspace.code ===
        "string"
          ? workspace.code
          : DEFAULT_CODE,

      language:
        typeof workspace.language ===
        "string"
          ? workspace.language
          : "javascript",

      redoLines: [],
    };
  } catch (error) {
    console.error(
      "❌ MongoDB load error:",
      error.message,
    );

    return createRoomState();
  }
};

/* =====================================================
   SAVE WORKSPACE IMMEDIATELY
===================================================== */

const saveWorkspaceNow = async (roomId) => {
  try {
    const state = roomStates[roomId];

    if (!state) return;

    const lines = Array.isArray(
      state.lines,
    )
      ? state.lines
          .map(normalizeLine)
          .filter(Boolean)
      : [];

    await Workspace.findOneAndUpdate(
      { roomId },

      {
        $set: {
          roomId,

          code:
            typeof state.code === "string"
              ? state.code
              : DEFAULT_CODE,

          language:
            typeof state.language ===
            "string"
              ? state.language
              : "javascript",

          lines,
        },
      },

      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    console.log(
      `💾 Saved workspace: ${roomId}`,
    );
  } catch (error) {
    console.error(
      "❌ MongoDB save error:",
      error.message,
    );
  }
};

/* =====================================================
   DEBOUNCED SAVE
===================================================== */

const scheduleSave = (roomId) => {
  if (saveTimers[roomId]) {
    clearTimeout(saveTimers[roomId]);
  }

  saveTimers[roomId] = setTimeout(
    async () => {
      delete saveTimers[roomId];

      await saveWorkspaceNow(roomId);
    },
    300,
  );
};

/* =====================================================
   BROADCAST FULL ROOM STATE
===================================================== */

const broadcastRoomState = (
  roomId,
) => {
  const state = roomStates[roomId];

  if (!state) return;

  io.to(roomId).emit(
    "room-state",
    {
      lines: [...state.lines],

      texts: [...state.texts],

      code: state.code,

      language:
        state.language ||
        "javascript",

      redoLines: [
        ...state.redoLines,
      ],
    },
  );
};

/* =====================================================
   SOCKET CONNECTION
===================================================== */

io.on("connection", (socket) => {
  console.log(
    "🟢 Socket connected:",
    socket.id,
  );

  /* ===================================================
     JOIN ROOM
  =================================================== */

  socket.on(
    "join-room",
    async (data) => {
      try {
        const roomId =
          typeof data === "string"
            ? data.trim()
            : data?.roomId?.trim();

        const name =
          typeof data === "object" &&
          typeof data?.name ===
            "string"
            ? data.name.trim()
            : "";

        if (!roomId) {
          socket.emit(
            "room-error",
            {
              message:
                "Room ID is required.",
            },
          );

          return;
        }

        const safeName =
          name.slice(0, 30) ||
          `User-${socket.id.slice(
            0,
            4,
          )}`;

        /* -----------------------------------------------
           LEAVE OLD ROOM
        ----------------------------------------------- */

        if (
          socket.currentRoom &&
          socket.currentRoom !== roomId
        ) {
          const oldRoom =
            socket.currentRoom;

          socket.leave(oldRoom);

          if (roomUsers[oldRoom]) {
            roomUsers[oldRoom] =
              roomUsers[
                oldRoom
              ].filter(
                (user) =>
                  user.socketId !==
                  socket.id,
              );

            broadcastRoomUsers(
              oldRoom,
            );

            if (
              roomUsers[oldRoom]
                .length === 0
            ) {
              delete roomUsers[
                oldRoom
              ];
            }
          }
        }

        /* -----------------------------------------------
           JOIN
        ----------------------------------------------- */

        socket.currentRoom =
          roomId;

        socket.join(roomId);

        /* -----------------------------------------------
           USERS
        ----------------------------------------------- */

        if (!roomUsers[roomId]) {
          roomUsers[roomId] = [];
        }

        roomUsers[roomId] =
          roomUsers[roomId].filter(
            (user) =>
              user.socketId !==
              socket.id,
          );

        roomUsers[roomId].push({
          socketId: socket.id,
          name: safeName,
        });

        /* -----------------------------------------------
           LOAD DATABASE
        ----------------------------------------------- */

        if (!roomStates[roomId]) {
          roomStates[roomId] =
            await loadWorkspace(
              roomId,
            );
        }

        const state =
          roomStates[roomId];

        console.log(
          `🚀 ${safeName} joined ${roomId}`,
        );

        /* -----------------------------------------------
           SEND USERS
        ----------------------------------------------- */

        broadcastRoomUsers(
          roomId,
        );

        /* -----------------------------------------------
           SEND COMPLETE STATE
        ----------------------------------------------- */

        socket.emit(
          "room-state",
          {
            lines: [...state.lines],

            texts: [...state.texts],

            code: state.code,

            language:
              state.language ||
              "javascript",

            redoLines: [
              ...state.redoLines,
            ],
          },
        );

        console.log(
          `📦 State sent to ${safeName}`,
        );
      } catch (error) {
        console.error(
          "❌ Join room error:",
          error,
        );

        socket.emit(
          "room-error",
          {
            message:
              "Unable to join room.",
          },
        );
      }
    },
  );

  /* ===================================================
     CHANGE NAME
  =================================================== */

  socket.on(
    "change-name",
    (data) => {
      const roomId =
        socket.currentRoom;

      if (!roomId) return;

      const newName =
        typeof data?.name ===
        "string"
          ? data.name.trim()
          : "";

      if (!newName) return;

      if (newName.length > 30) {
        return;
      }

      const user =
        roomUsers[roomId]?.find(
          (member) =>
            member.socketId ===
            socket.id,
        );

      if (!user) return;

      const oldName =
        user.name;

      user.name = newName;

      broadcastRoomUsers(
        roomId,
      );

      socket.emit(
        "name-changed",
        {
          name: newName,
        },
      );

      socket
        .to(roomId)
        .emit(
          "user-name-changed",
          {
            socketId:
              socket.id,
            oldName,
            newName,
          },
        );
    },
  );

  /* ===================================================
     DRAW LINE
  =================================================== */

  socket.on(
    "draw-line",
    (data) => {
      const roomId =
        data?.roomId ||
        socket.currentRoom;

      if (!roomId) return;

      if (
        !Array.isArray(
          data?.points,
        )
      ) {
        return;
      }

      if (!roomStates[roomId]) {
        roomStates[roomId] =
          createRoomState();
      }

      const allowedTypes = [
        "pen",
        "eraser",
        "rectangle",
        "circle",
        "line",
        "arrow",
      ];

      const tool =
        allowedTypes.includes(
          data.tool,
        )
          ? data.tool
          : "pen";

      const points =
        data.points
          .map((point) => ({
            x:
              Number(point?.x) ||
              0,

            y:
              Number(point?.y) ||
              0,
          }))
          .filter(
            (point) =>
              Number.isFinite(
                point.x,
              ) &&
              Number.isFinite(
                point.y,
              ),
          );

      if (points.length === 0) {
        return;
      }

      const newLine = {
        id:
          String(
            data.id ||
              `${socket.id}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
          ),

        type: tool,

        tool,

        points,

        color:
          typeof data.color ===
          "string"
            ? data.color
            : "#2563eb",

        brushSize:
          Number(data.brushSize) ||
          4,

        socketId:
          socket.id,
      };

      const state =
        roomStates[roomId];

      const exists =
        state.lines.some(
          (line) =>
            line.id ===
            newLine.id,
        );

      if (exists) return;

      state.lines.push(
        newLine,
      );

      /* New drawing invalidates redo */
      state.redoLines = [];

      /* -----------------------------------------------
         SEND TO EVERYONE
         Including sender.
      ----------------------------------------------- */

      io.to(roomId).emit(
        "draw-line",
        newLine,
      );

      io.to(roomId).emit(
        "redo-state",
        {
          redoLines: [],
        },
      );

      scheduleSave(roomId);

      console.log(
        `✏️ ${getUserName(
          socket,
          roomId,
        )} drew ${tool}`,
      );
    },
  );

  /* ===================================================
     UNDO
  =================================================== */

  socket.on(
    "undo",
    (data) => {
      const roomId =
        data?.roomId ||
        socket.currentRoom;

      if (!roomId) return;

      const state =
        roomStates[roomId];

      if (!state) return;

      if (
        state.lines.length ===
        0
      ) {
        return;
      }

      const removed =
        state.lines.pop();

      if (removed) {
        state.redoLines.push(
          removed,
        );
      }

      broadcastRoomState(
        roomId,
      );

      scheduleSave(roomId);

      console.log(
        `↩️ ${getUserName(
          socket,
          roomId,
        )} undo`,
      );
    },
  );

  /* ===================================================
     REDO
  =================================================== */

  socket.on(
    "redo",
    (data) => {
      const roomId =
        data?.roomId ||
        socket.currentRoom;

      if (!roomId) return;

      const state =
        roomStates[roomId];

      if (!state) return;

      if (
        state.redoLines.length ===
        0
      ) {
        return;
      }

      const restored =
        state.redoLines.pop();

      if (restored) {
        state.lines.push(
          restored,
        );
      }

      broadcastRoomState(
        roomId,
      );

      scheduleSave(roomId);

      console.log(
        `↪️ ${getUserName(
          socket,
          roomId,
        )} redo`,
      );
    },
  );

  /* ===================================================
     CLEAR BOARD
  =================================================== */

  socket.on(
    "clear-board",
    (data) => {
      const roomId =
        data?.roomId ||
        socket.currentRoom;

      if (!roomId) return;

      const state =
        roomStates[roomId];

      if (!state) return;

      state.lines = [];
      state.texts = [];
      state.redoLines = [];

      io.to(roomId).emit(
        "board-state",
        {
          lines: [],
          texts: [],
          redoLines: [],
        },
      );

      io.to(roomId).emit(
        "clear-board",
      );

      scheduleSave(roomId);

      console.log(
        `🗑️ ${getUserName(
          socket,
          roomId,
        )} cleared board`,
      );
    },
  );

  /* ===================================================
     CODE CHANGE
  =================================================== */

  socket.on(
    "code-change",
    (data) => {
      const roomId =
        data?.roomId ||
        socket.currentRoom;

      if (!roomId) return;

      if (
        typeof data?.code !==
        "string"
      ) {
        return;
      }

      if (!roomStates[roomId]) {
        roomStates[roomId] =
          createRoomState();
      }

      const state =
        roomStates[roomId];

      state.code = data.code;

      if (
        typeof data.language ===
        "string"
      ) {
        state.language =
          data.language;
      }

      /* -----------------------------------------------
         IMPORTANT:
         Send latest code to EVERYONE except nobody.
         Sender also receives authoritative value.
      ----------------------------------------------- */

      io.to(roomId).emit(
        "code-update",
        {
          code: state.code,

          language:
            state.language,
        },
      );

      scheduleSave(roomId);

      console.log(
        `💻 Code updated in ${roomId}`,
      );
    },
  );

  /* ===================================================
     ADD TEXT
  =================================================== */

  socket.on(
    "add-text",
    (data) => {
      const roomId =
        data?.roomId ||
        socket.currentRoom;

      if (
        !roomId ||
        !data?.text
      ) {
        return;
      }

      if (!roomStates[roomId]) {
        roomStates[roomId] =
          createRoomState();
      }

      const state =
        roomStates[roomId];

      const text =
        data.text;

      if (
        !state.texts.some(
          (item) =>
            item.id ===
            text.id,
        )
      ) {
        state.texts.push(text);
      }

      io.to(roomId).emit(
        "add-text",
        {
          text,
        },
      );
    },
  );

  /* ===================================================
     DELETE TEXT
  =================================================== */

  socket.on(
    "delete-text",
    (data) => {
      const roomId =
        data?.roomId ||
        socket.currentRoom;

      if (
        !roomId ||
        !data?.textId
      ) {
        return;
      }

      const state =
        roomStates[roomId];

      if (!state) return;

      state.texts =
        state.texts.filter(
          (text) =>
            text.id !==
            data.textId,
        );

      io.to(roomId).emit(
        "delete-text",
        {
          textId:
            data.textId,
        },
      );
    },
  );

  /* ===================================================
     CHAT
  =================================================== */

  socket.on(
    "chat-message",
    (data) => {
      const roomId =
        data?.roomId ||
        socket.currentRoom;

      if (
        !roomId ||
        typeof data?.message !==
          "string"
      ) {
        return;
      }

      const message =
        data.message.trim();

      if (!message) return;

      const user =
        roomUsers[roomId]?.find(
          (member) =>
            member.socketId ===
            socket.id,
        );

      io.to(roomId).emit(
        "chat-message",
        {
          id: `${socket.id}-${Date.now()}`,

          socketId:
            socket.id,

          user:
            user?.name ||
            `User-${socket.id.slice(
              0,
              4,
            )}`,

          message,

          timestamp:
            Date.now(),
        },
      );
    },
  );

  /* ===================================================
     LEAVE ROOM
  =================================================== */

  socket.on(
    "leave-room",
    (data) => {
      const roomId =
        data?.roomId ||
        socket.currentRoom;

      if (!roomId) return;

      socket.leave(roomId);

      if (roomUsers[roomId]) {
        roomUsers[roomId] =
          roomUsers[roomId].filter(
            (user) =>
              user.socketId !==
              socket.id,
          );

        broadcastRoomUsers(
          roomId,
        );

        if (
          roomUsers[roomId]
            .length === 0
        ) {
          delete roomUsers[
            roomId
          ];
        }
      }

      socket.currentRoom =
        null;
    },
  );

  /* ===================================================
     DISCONNECT
  =================================================== */

  socket.on(
    "disconnect",
    (reason) => {
      console.log(
        "🔴 Socket disconnected:",
        socket.id,
        reason,
      );

      const roomId =
        socket.currentRoom;

      if (!roomId) return;

      if (roomUsers[roomId]) {
        roomUsers[roomId] =
          roomUsers[roomId].filter(
            (user) =>
              user.socketId !==
              socket.id,
          );

        broadcastRoomUsers(
          roomId,
        );

        if (
          roomUsers[roomId]
            .length === 0
        ) {
          delete roomUsers[
            roomId
          ];
        }
      }

      socket.currentRoom =
        null;
    },
  );
});

/* =====================================================
   START
===================================================== */

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing in .env",
      );
    }

    await mongoose.connect(
      process.env.MONGO_URI,
    );

    console.log(
      "🍃 MongoDB connected successfully",
    );

    server.listen(
      PORT,
      () => {
        console.log(
          `🚀 SyncSpace running on http://localhost:${PORT}`,
        );
      },
    );
  } catch (error) {
    console.error(
      "❌ Server startup failed:",
      error.message,
    );

    process.exit(1);
  }
};

startServer();