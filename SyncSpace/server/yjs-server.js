require("dotenv").config();

const http = require("http");
const mongoose = require("mongoose");
const { WebSocketServer } = require("ws");
const Y = require("yjs");
const { setupWSConnection } = require("y-websocket");

const Workspace = require("./models/Workspace");

const PORT = process.env.YJS_PORT || 1234;

const server = http.createServer();

const wss = new WebSocketServer({
  noServer: true,
});

// =====================================================
// YJS DOCUMENT CACHE
// =====================================================

const docs = new Map();

const getDocument = (roomId) => {
  if (!docs.has(roomId)) {
    docs.set(roomId, new Y.Doc());
  }

  return docs.get(roomId);
};

// =====================================================
// LOAD YJS STATE FROM MONGODB
// =====================================================

const loadYjsState = async (roomId) => {
  try {
    const workspace = await Workspace.findOne({
      roomId,
    }).lean();

    if (
      workspace &&
      workspace.yjsState
    ) {
      const doc = getDocument(roomId);

      const update = Buffer.from(
        workspace.yjsState
      );

      Y.applyUpdate(
        doc,
        new Uint8Array(update)
      );

      console.log(
        `📦 Yjs state loaded: ${roomId}`
      );

      return doc;
    }

    console.log(
      `🆕 New Yjs document: ${roomId}`
    );

    return getDocument(roomId);
  } catch (error) {
    console.error(
      "❌ Yjs MongoDB load error:",
      error.message
    );

    return getDocument(roomId);
  }
};

// =====================================================
// SAVE YJS STATE
// =====================================================

const saveYjsState = async (roomId, doc) => {
  try {
    const update =
      Y.encodeStateAsUpdate(doc);

    await Workspace.findOneAndUpdate(
      {
        roomId,
      },
      {
        $set: {
          roomId,
          yjsState: Buffer.from(update),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(
      `💾 Yjs saved: ${roomId} (${update.length} bytes)`
    );
  } catch (error) {
    console.error(
      "❌ Yjs MongoDB save error:",
      error.message
    );
  }
};

// =====================================================
// DEBOUNCED PERSISTENCE
// =====================================================

const saveTimers = new Map();

const scheduleYjsSave = (
  roomId,
  doc
) => {
  if (saveTimers.has(roomId)) {
    clearTimeout(
      saveTimers.get(roomId)
    );
  }

  const timer = setTimeout(
    async () => {
      saveTimers.delete(roomId);

      await saveYjsState(
        roomId,
        doc
      );
    },
    1000
  );

  saveTimers.set(
    roomId,
    timer
  );
};

// =====================================================
// WEBSOCKET CONNECTION
// =====================================================

wss.on(
  "connection",
  async (ws, request) => {
    try {
      const url = new URL(
        request.url,
        `http://${request.headers.host}`
      );

      const roomId =
        url.pathname
          .replace(/^\/+/, "")
          .trim();

      if (!roomId) {
        ws.close(
          1008,
          "Room ID required"
        );

        return;
      }

      const doc =
        await loadYjsState(
          roomId
        );

      // Listen for every Yjs update.
      const updateHandler = (
        update,
        origin
      ) => {
        // y-websocket handles broadcasting.
        // We only persist the CRDT state.
        scheduleYjsSave(
          roomId,
          doc
        );
      };

      doc.on(
        "update",
        updateHandler
      );

      // Attach Y-WebSocket connection.
      setupWSConnection(
        ws,
        request,
        {
          gc: true,
        }
      );

      console.log(
        `🟢 Yjs client connected: ${roomId}`
      );

      ws.on(
        "close",
        async () => {
          try {
            await saveYjsState(
              roomId,
              doc
            );

            doc.off(
              "update",
              updateHandler
            );

            console.log(
              `🔴 Yjs client disconnected: ${roomId}`
            );
          } catch (error) {
            console.error(
              "❌ Yjs close save error:",
              error.message
            );
          }
        }
      );
    } catch (error) {
      console.error(
        "❌ Yjs connection error:",
        error.message
      );

      try {
        ws.close(
          1011,
          "Yjs server error"
        );
      } catch {}
    }
  }
);

// =====================================================
// HTTP UPGRADE
// =====================================================

server.on(
  "upgrade",
  (
    request,
    socket,
    head
  ) => {
    wss.handleUpgrade(
      request,
      socket,
      head,
      (ws) => {
        wss.emit(
          "connection",
          ws,
          request
        );
      }
    );
  }
);

// =====================================================
// START
// =====================================================

const start = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing in .env"
      );
    }

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "🍃 MongoDB connected for Yjs"
    );

    server.listen(
      PORT,
      () => {
        console.log(
          `🚀 Yjs WebSocket server running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "❌ Yjs server startup failed:",
      error.message
    );

    process.exit(1);
  }
};

start();