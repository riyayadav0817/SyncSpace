require("dotenv").config();

const http = require("http");
const { WebSocketServer } = require("ws");
const Y = require("yjs");
const yUtils = require("y-websocket/bin/utils");

const { MongodbPersistence } = require("y-mongodb-provider");

// =====================================================
// CONFIG
// =====================================================

const PORT =
  Number(process.env.PORT) ||
  Number(process.env.YJS_PORT) ||
  1234;

const HOST =
  process.env.HOST ||
  "0.0.0.0";

const MONGO_URI =
  process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing.");
  process.exit(1);
}

// =====================================================
// HTTP SERVER
// =====================================================

const server = http.createServer((req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        success: true,
        service: "syncspace-yjs",
        status: "online",
      })
    );

    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain",
  });

  res.end("SyncSpace Yjs server running.");
});

// =====================================================
// WEBSOCKET SERVER
// =====================================================

const wss = new WebSocketServer({
  noServer: true,
});

// =====================================================
// MONGODB YJS PERSISTENCE
// =====================================================

const persistence =
  new MongodbPersistence(
    MONGO_URI,
    {
      collectionName:
        "syncspace-yjs-transactions",

      flushSize: 100,

      multipleCollections: false,
    }
  );

// =====================================================
// CONNECT YJS PERSISTENCE TO Y-WEBSOCKET
// =====================================================

yUtils.setPersistence({
  // ---------------------------------------------------
  // LOAD DOCUMENT
  // ---------------------------------------------------

  bindState: async (
    docName,
    ydoc
  ) => {
    try {
      console.log(
        `📥 Loading Yjs room: ${docName}`
      );

      const persistedYdoc =
        await persistence.getYDoc(
          docName
        );

      const persistedState =
        Y.encodeStateAsUpdate(
          persistedYdoc
        );

      if (
        persistedState.length > 0
      ) {
        Y.applyUpdate(
          ydoc,
          persistedState
        );
      }

      // Persist every incremental update.
      ydoc.on(
        "update",
        async (update) => {
          try {
            await persistence.storeUpdate(
              docName,
              update
            );

            console.log(
              `💾 Yjs update saved: ${docName}`
            );
          } catch (error) {
            console.error(
              `❌ Yjs update save failed (${docName}):`,
              error.message
            );
          }
        }
      );

      console.log(
        `✅ Yjs room ready: ${docName}`
      );
    } catch (error) {
      console.error(
        `❌ Yjs bindState failed (${docName}):`,
        error.message
      );

      throw error;
    }
  },

  // ---------------------------------------------------
  // DOCUMENT CLOSED
  // ---------------------------------------------------

  writeState: async (
    docName,
    ydoc
  ) => {
    try {
      console.log(
        `💾 Finalizing Yjs room: ${docName}`
      );

      await persistence.flushDocument(
        docName
      );

      console.log(
        `✅ Yjs room persisted: ${docName}`
      );
    } catch (error) {
      console.error(
        `❌ Yjs final save failed (${docName}):`,
        error.message
      );

      throw error;
    }
  },
});

// =====================================================
// WEBSOCKET CONNECTION
// =====================================================

wss.on(
  "connection",
  (ws, request) => {
    try {
      yUtils.setupWSConnection(
        ws,
        request,
        {
          gc: true,
        }
      );

      console.log(
        "🟢 Yjs WebSocket connected:",
        request.url
      );
    } catch (error) {
      console.error(
        "❌ Yjs WebSocket connection error:",
        error.message
      );

      try {
        ws.close(
          1011,
          "Yjs server error"
        );
      } catch {}
    }

    ws.on(
      "close",
      () => {
        console.log(
          "🔴 Yjs WebSocket disconnected"
        );
      }
    );

    ws.on(
      "error",
      (error) => {
        console.error(
          "❌ Yjs WebSocket error:",
          error.message
        );
      }
    );
  }
);

// =====================================================
// HTTP → WEBSOCKET UPGRADE
// =====================================================

server.on(
  "upgrade",
  (
    request,
    socket,
    head
  ) => {
    try {
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
    } catch (error) {
      console.error(
        "❌ WebSocket upgrade failed:",
        error.message
      );

      socket.destroy();
    }
  }
);

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

const shutdown = async (
  signal
) => {
  console.log(
    `\n🛑 ${signal} received. Shutting down Yjs server...`
  );

  try {
    wss.close();

    server.close(
      async () => {
        try {
          await persistence.destroy();

          console.log(
            "✅ Yjs persistence closed."
          );

          process.exit(0);
        } catch (error) {
          console.error(
            "❌ Persistence shutdown error:",
            error.message
          );

          process.exit(1);
        }
      }
    );
  } catch (error) {
    console.error(
      "❌ Shutdown error:",
      error.message
    );

    process.exit(1);
  }
};

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

// =====================================================
// START
// =====================================================

server.listen(
  PORT,
  HOST,
  () => {
    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "🚀 SyncSpace Yjs Server"
    );
    console.log(
      "========================================"
    );
    console.log(
      `🌐 HTTP: http://${HOST}:${PORT}`
    );
    console.log(
      `🔌 WebSocket: ws://localhost:${PORT}`
    );
    console.log(
      "💾 Persistence: MongoDB"
    );
    console.log(
      "========================================"
    );
    console.log("");
  }
);
