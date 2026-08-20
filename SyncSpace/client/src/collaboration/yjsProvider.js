
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const YJS_SERVER_URL =
  import.meta.env.VITE_YJS_SERVER_URL ||
  "ws://localhost:1234";
  
export function createRoomProvider(
  roomId,
  user = {}
) {
  if (
    !roomId ||
    !String(roomId).trim()
  ) {
    throw new Error(
      "Room ID is required."
    );
  }

  const normalizedRoomId =
    String(roomId).trim();

  // =====================================================
  // YJS DOCUMENT
  // =====================================================

  const doc = new Y.Doc();

  // =====================================================
  // WEBSOCKET PROVIDER
  // =====================================================

  const provider =
    new WebsocketProvider(
      YJS_SERVER_URL,
      normalizedRoomId,
      doc,
      {
        connect: true,
      }
    );

  // =====================================================
  // AWARENESS
  // =====================================================

  const awareness =
    provider.awareness;

  // =====================================================
  // USER
  // =====================================================

  const setUserName = (
    name
  ) => {
    const safeName =
      String(name || "").trim() ||
      "Anonymous";

    awareness.setLocalStateField(
      "user",
      {
        name: safeName,
      }
    );
  };

  setUserName(user.name);

  // =====================================================
  // CURSOR
  // =====================================================

  const setCursorState = (
    cursor
  ) => {
    awareness.setLocalStateField(
      "cursor",
      cursor || null
    );
  };

  // =====================================================
  // SHARED CODE
  // =====================================================

  const code =
    doc.getText("code");

  // =====================================================
  // SHARED EDITOR STATE
  // =====================================================

  /*
   * IMPORTANT:
   *
   * Code and language are shared through
   * the same Yjs document.
   *
   * Language is stored as:
   *
   * editorState.get("language")
   *
   * Example:
   *
   * "javascript"
   * "python"
   * "java"
   * "cpp"
   */

  const editorState =
    doc.getMap(
      "editor-state"
    );

  // =====================================================
  // DEFAULT LANGUAGE
  // =====================================================

  /*
   * DO NOT overwrite an existing
   * shared language.
   *
   * Only create the value when
   * the key does not exist.
   */

  if (
    !editorState.has(
      "language"
    )
  ) {
    editorState.set(
      "language",
      "javascript"
    );
  }

  // =====================================================
  // WHITEBOARD
  // =====================================================

  const whiteboard =
    doc.getArray(
      "whiteboard"
    );

  // =====================================================
  // WHITEBOARD REDO
  // =====================================================

  const whiteboardRedo =
    doc.getArray(
      "whiteboard-redo"
    );

  // =====================================================
  // CONNECTION LOGS
  // =====================================================

  const handleStatus = ({
    status,
  }) => {
    console.log(
      `🔌 Yjs [${normalizedRoomId}]:`,
      status
    );
  };

  const handleSync = (
    isSynced
  ) => {
    console.log(
      `🔄 Yjs [${normalizedRoomId}] synced:`,
      isSynced
    );

    if (!isSynced) {
      return;
    }

    console.log(
      "🌐 Shared language:",
      editorState.get(
        "language"
      )
    );

    console.log(
      "🌐 Shared code length:",
      code.toString().length
    );
  };

  provider.on(
    "status",
    handleStatus
  );

  provider.on(
    "sync",
    handleSync
  );

  // =====================================================
  // RETURN
  // =====================================================

  return {
    doc,

    provider,

    awareness,

    code,

    editorState,

    whiteboard,

    whiteboardRedo,

    setUserName,

    setCursorState,

    roomId:
      normalizedRoomId,
  };
}
