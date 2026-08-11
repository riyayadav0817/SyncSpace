
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import Header from "./components/Header";
import Participants from "./components/Participants";
import RoomPanel from "./components/RoomPanel";
import Whiteboard from "./components/Whiteboard";
import CodeEditor from "./components/CodeEditor";

const socket = io("http://localhost:5000");

function App() {
  const [status, setStatus] = useState("Connecting...");

  // Room
  const [roomId, setRoomId] = useState("");
  const [joinedRoom, setJoinedRoom] = useState("");

  // Participants
  const [participants, setParticipants] = useState([]);

  // Whiteboard
  const [lines, setLines] = useState([]);
  const [color, setColor] = useState("#2563eb");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);

  // Code Editor
  const [code, setCode] = useState(
    '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");'
  );

  const [language, setLanguage] = useState("javascript");

  // =========================
  // SOCKET CONNECTION
  // =========================

  useEffect(() => {
    const handleConnect = () => {
      setStatus("Connected to SyncSpace Server ✅");
    };

    const handleDisconnect = () => {
      setStatus("Disconnected from Server ❌");
      setParticipants([]);
    };

    const handleRoomUsers = (users) => {
      setParticipants(users);
    };

    const handleDrawLine = (data) => {
      setLines((oldLines) => [
        ...oldLines,
        {
          points: data.points,
          color: data.color,
          brushSize: data.brushSize,
        },
      ]);
    };

    const handleClearBoard = () => {
      setLines([]);
    };

    const handleCodeUpdate = (data) => {
      setCode(data.code);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room-users", handleRoomUsers);
    socket.on("draw-line", handleDrawLine);
    socket.on("clear-board", handleClearBoard);
    socket.on("code-update", handleCodeUpdate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room-users", handleRoomUsers);
      socket.off("draw-line", handleDrawLine);
      socket.off("clear-board", handleClearBoard);
      socket.off("code-update", handleCodeUpdate);
    };
  }, []);

  // =========================
  // JOIN ROOM
  // =========================

  const joinRoom = () => {
    const trimmedRoomId = roomId.trim();

    if (!trimmedRoomId) {
      alert("Please enter a Room ID");
      return;
    }

    socket.emit("join-room", trimmedRoomId);

    setJoinedRoom(trimmedRoomId);
  };

  // =========================
  // UI
  // =========================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "auto",
        }}
      >
        {/* HEADER */}

        <Header status={status} />

        {/* ROOM */}

        <RoomPanel
          roomId={roomId}
          setRoomId={setRoomId}
          joinedRoom={joinedRoom}
          onJoinRoom={joinRoom}
        />

        {/* PARTICIPANTS */}

        <Participants
          joinedRoom={joinedRoom}
          participants={participants}
          currentSocketId={socket.id}
        />

        {/* WHITEBOARD */}

        <Whiteboard
          joinedRoom={joinedRoom}
          lines={lines}
          setLines={setLines}
          color={color}
          setColor={setColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          isDrawing={isDrawing}
          setIsDrawing={setIsDrawing}
          socket={socket}
        />

        {/* CODE EDITOR */}

        <CodeEditor
          code={code}
          setCode={setCode}
          language={language}
          setLanguage={setLanguage}
          joinedRoom={joinedRoom}
          socket={socket}
        />
      </div>
    </div>
  );
}

export default App;

