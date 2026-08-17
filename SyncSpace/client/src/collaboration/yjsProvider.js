import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export function createRoomProvider(roomId, user = {}) {
  if (!roomId) {
    throw new Error("Room ID is required.");
  }

  // =====================================================
  // YJS DOCUMENT
  // =====================================================

  const doc = new Y.Doc();

  // =====================================================
  // WEBSOCKET PROVIDER
  // =====================================================

  const provider = new WebsocketProvider(
    "ws://localhost:1234",
    roomId,
    doc,
    {
      connect: true,
    }
  );

  // =====================================================
  // CONNECTION STATUS
  // =====================================================

  provider.on("status", ({ status }) => {
    console.log("🔌 Yjs:", status);
  });

  // =====================================================
  // SYNC STATUS
  // =====================================================

  provider.on("sync", (isSynced) => {
    console.log("🔄 Yjs sync:", isSynced);
  });

  // =====================================================
  // AWARENESS USER
  // =====================================================

  provider.awareness.setLocalStateField("user", {
    name:
      user.name?.trim() ||
      "Anonymous",
  });

  // =====================================================
  // SET USER NAME
  // =====================================================

  const setUserName = (name) => {
    provider.awareness.setLocalStateField(
      "user",
      {
        name:
          name?.trim() ||
          "Anonymous",
      }
    );
  };

  // =====================================================
  // CURSOR
  // =====================================================

  const setCursorState = (cursor) => {
    provider.awareness.setLocalStateField(
      "cursor",
      cursor || null
    );
  };

  // =====================================================
  // CODE
  // =====================================================

  const code = doc.getText("code");

  // =====================================================
  // WHITEBOARD
  // =====================================================

  const whiteboard =
    doc.getArray("whiteboard");

  // =====================================================
  // WHITEBOARD REDO
  // =====================================================

  const whiteboardRedo =
    doc.getArray(
      "whiteboard-redo"
    );

  // =====================================================
  // DEBUG CODE CHANGES
  // =====================================================

  code.observe(() => {
    console.log(
      "📝 Y.Text changed:",
      code.toString()
    );
  });

  // =====================================================
  // DEBUG WHITEBOARD CHANGES
  // =====================================================

  whiteboard.observe(() => {
    console.log(
      "🎨 Whiteboard changed:",
      whiteboard.length,
      "strokes"
    );
  });

  // =====================================================
  // RETURN EVERYTHING
  // =====================================================

  return {
    doc,

    provider,

    awareness:
      provider.awareness,

    code,

    whiteboard,

    whiteboardRedo,

    setUserName,

    setCursorState,
  };
}