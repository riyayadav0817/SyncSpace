import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export function createRoomProvider(roomId, user = {}) {
  if (!roomId) {
    throw new Error("Room ID is required.");
  }

  const doc = new Y.Doc();

  const provider = new WebsocketProvider(
    "ws://localhost:1234",
    roomId,
    doc
  );

  // Current user's name
  provider.awareness.setLocalStateField("user", {
    name: user.name?.trim() || "Anonymous",
  });

  // Update current user's name in Yjs Awareness
  const setUserName = (name) => {
    provider.awareness.setLocalStateField("user", {
      name: name?.trim() || "Anonymous",
    });
  };

  return {
    doc,
    provider,
    awareness: provider.awareness,
    code: doc.getText("code"),
    setUserName,
  };
}