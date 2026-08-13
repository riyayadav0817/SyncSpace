import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import Participants from "./components/Participants";
import RoomPanel from "./components/RoomPanel";
import Whiteboard from "./components/Whiteboard";
import CodeEditor from "./components/CodeEditor";
import Chat from "./components/Chat";
import WorkspaceLayout from "./components/WorkspaceLayout";

import "./App.css";

const socket = io("http://localhost:5000");

// =====================================================
// APP
// =====================================================

function App() {
  // ===================================================
  // CONNECTION
  // ===================================================

  const [status, setStatus] = useState("Connecting...");

  // ===================================================
  // NAVIGATION
  // ===================================================

  const [activeSection, setActiveSection] = useState("code");

  // ===================================================
  // USER
  // ===================================================

  const [userName, setUserName] = useState(
    localStorage.getItem("syncspaceName") || ""
  );

  // ===================================================
  // ROOM
  // ===================================================

  const [roomId, setRoomId] = useState(
    localStorage.getItem("syncspaceRoom") || ""
  );

  const [joinedRoom, setJoinedRoom] = useState(
    localStorage.getItem("syncspaceRoom") || ""
  );

  // ===================================================
  // PARTICIPANTS
  // ===================================================

  const [participants, setParticipants] = useState([]);

  // ===================================================
  // WHITEBOARD
  // ===================================================

  const [lines, setLines] = useState([]);
  const [color, setColor] = useState("#2563eb");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // ===================================================
  // CODE
  // ===================================================

  const [code, setCode] = useState(
    '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");'
  );

  const [language, setLanguage] = useState("javascript");

  // ===================================================
  // SOCKET EVENTS
  // ===================================================

  useEffect(() => {
    const handleConnect = () => {
      setStatus("Connected to SyncSpace Server ✅");
    };

    const handleDisconnect = () => {
      setStatus("Disconnected from Server ❌");
      setParticipants([]);
    };

    const handleRoomUsers = (users) => {
      if (Array.isArray(users)) {
        setParticipants(users);
      }
    };

    const handleRoomState = (state) => {
      if (!state) return;

      if (Array.isArray(state.lines)) {
        setLines(state.lines);
      }

      if (typeof state.code === "string") {
        setCode(state.code);
      }
    };

    const handleDrawLine = (data) => {
      if (!data || !Array.isArray(data.points)) {
        return;
      }

      setLines((previous) => [
        ...previous,
        {
          points: data.points,
          color: data.color || "#2563eb",
          brushSize: data.brushSize || 4,
        },
      ]);
    };

    const handleClearBoard = () => {
      setLines([]);
      setHistory([]);
      setRedoStack([]);
    };

    const handleCodeUpdate = (data) => {
      if (typeof data?.code !== "string") {
        return;
      }

      setCode(data.code);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room-users", handleRoomUsers);
    socket.on("room-state", handleRoomState);
    socket.on("draw-line", handleDrawLine);
    socket.on("clear-board", handleClearBoard);
    socket.on("code-update", handleCodeUpdate);

    // If already connected
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room-users", handleRoomUsers);
      socket.off("room-state", handleRoomState);
      socket.off("draw-line", handleDrawLine);
      socket.off("clear-board", handleClearBoard);
      socket.off("code-update", handleCodeUpdate);
    };
  }, []);

  // ===================================================
  // JOIN ROOM
  // ===================================================

  const joinRoom = () => {
    const name = userName.trim();
    const room = roomId.trim();

    if (!name) {
      alert("Please enter your name");
      return;
    }

    if (!room) {
      alert("Please enter Room ID");
      return;
    }

    socket.emit("join-room", {
      roomId: room,
      name: name,
    });

    localStorage.setItem("syncspaceName", name);
    localStorage.setItem("syncspaceRoom", room);

    setUserName(name);
    setRoomId(room);
    setJoinedRoom(room);

    // Automatically show Code after joining
    setActiveSection("code");
  };

  // ===================================================
  // NAVIGATION
  // ===================================================

  const navigationButton = (section, icon, label) => {
    const active = activeSection === section;

    return (
      <button
        key={section}
        type="button"
        className={
          active
            ? "workspace-nav-button workspace-nav-active"
            : "workspace-nav-button"
        }
        onClick={() => {
          console.log("Opening:", section);
          setActiveSection(section);
        }}
      >
        <span className="workspace-nav-icon">
          {icon}
        </span>

        <span>{label}</span>
      </button>
    );
  };

  // ===================================================
  // CURRENT CONTENT
  // ===================================================

  const renderWorkspaceContent = () => {
    // ---------------- CODE ----------------

    if (activeSection === "code") {
      return (
        <CodeEditor
          code={code}
          setCode={setCode}
          language={language}
          setLanguage={setLanguage}
          joinedRoom={joinedRoom}
          socket={socket}
        />
      );
    }

    // ---------------- WHITEBOARD ----------------

    if (activeSection === "whiteboard") {
      return (
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
          history={history}
          setHistory={setHistory}
          redoStack={redoStack}
          setRedoStack={setRedoStack}
        />
      );
    }

    // ---------------- CHAT ----------------

    if (activeSection === "chat") {
      return (
        <Chat
          joinedRoom={joinedRoom}
          socket={socket}
        />
      );
    }

    // ---------------- TEAM ----------------

    if (activeSection === "team") {
      return (
        <Participants
          joinedRoom={joinedRoom}
          participants={participants}
          currentSocketId={socket.id}
        />
      );
    }

    return null;
  };

  // ===================================================
  // UI
  // ===================================================

  return (
    <WorkspaceLayout
      status={status}
      joinedRoom={joinedRoom}
      participants={participants}
    >
      {/* ============================================= */}
      {/* LEFT NAVIGATION */}
      {/* ============================================= */}

      <aside className="workspace-navigation">
        <div className="workspace-brand">
          🚀 SyncSpace
        </div>

        <div className="workspace-room-name">
          📁 {joinedRoom || "No Room"}
        </div>

        <div className="workspace-label">
          Navigation
        </div>

        {navigationButton(
          "code",
          "💻",
          "Code"
        )}

        {navigationButton(
          "whiteboard",
          "🖍",
          "Whiteboard"
        )}

        {navigationButton(
          "chat",
          "💬",
          "Chat"
        )}

        {navigationButton(
          "team",
          "👥",
          "Team"
        )}
      </aside>

      {/* ============================================= */}
      {/* ROOM PANEL */}
      {/* ============================================= */}

      <section className="workspace-room-panel">
        <RoomPanel
          roomId={roomId}
          setRoomId={setRoomId}
          joinedRoom={joinedRoom}
          onJoinRoom={joinRoom}
          userName={userName}
          setUserName={setUserName}
        />
      </section>

      {/* ============================================= */}
      {/* MAIN CONTENT */}
      {/* ============================================= */}

      <main className="workspace-main-content">
        {renderWorkspaceContent()}
      </main>
    </WorkspaceLayout>
  );
}

export default App;