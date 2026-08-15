import { createRoomProvider } from "./yjsProvider";

const rooms = new Map();

export function getRoomDocument(roomId) {
  if (!roomId) {
    throw new Error("Room ID is required.");
  }

  if (!rooms.has(roomId)) {
    const room = createRoomProvider(roomId);

    rooms.set(roomId, room);
  }

  return rooms.get(roomId);
}

export function removeRoomDocument(roomId) {
  if (!roomId) {
    return;
  }

  const room = rooms.get(roomId);

  if (room) {
    room.provider.destroy();
    room.doc.destroy();

    rooms.delete(roomId);
  }
}

export function hasRoomDocument(roomId) {
  return rooms.has(roomId);
}