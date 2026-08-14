import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import Participants from "./components/Participants";
import RoomPanel from "./components/RoomPanel";
import Whiteboard from "./components/Whiteboard";
import CodeEditor from "./components/CodeEditor";
import Chat from "./components/Chat";
import WorkspaceLayout from "./components/WorkspaceLayout";
import DisconnectBanner from "./components/DisconnectBanner";
import ErrorBoundary from "./components/ErrorBoundary";

import "./App.css";

const socket = io("http://localhost:5000", {
  autoConnect: true,
});

function App() {
  const [status, setStatus] = useState("Connecting...");
  const [activeSection, setActiveSection] = useState("code");

  const [userName, setUserName] = useState(
    localStorage.getItem("syncspaceName") || ""
  );

  const [roomId, setRoomId] = useState(
    localStorage.getItem("syncspaceRoom") || ""
  );

  const [joinedRoom, setJoinedRoom] = useState("");

  const [participants, setParticipants] = useState([]);

  // =========================
  // WHITEBOARD STATE
  // =========================

  const [lines, setLines] = useState([]);
  const [color, setColor] = useState("#2563eb");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // =========================
  // CODE STATE
  // =========================

  const [code, setCode] = useState(
    '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");'
  );

  const [language, setLanguage] = useState("javascript");

  // =========================
  // SOCKET EVENTS
  // =========================

  useEffect(() => {
    const handleConnect = () => {
      console.log("Socket connected:", socket.id);

      setStatus("Connected to SyncSpace Server ✅");

      const savedRoom = localStorage.getItem("syncspaceRoom");
      const savedName = localStorage.getItem("syncspaceName");

      if (savedRoom && savedName) {
        console.log("Rejoining room:", savedRoom);

        socket.emit("join-room", {
          roomId: savedRoom,
          name: savedName,
        });

        setJoinedRoom(savedRoom);
        setRoomId(savedRoom);
        setUserName(savedName);
      }
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");

      setStatus("Disconnected from Server ❌");
      setParticipants([]);
    };

    const handleRoomUsers = (users) => {
      console.log("Room users:", users);

      if (Array.isArray(users)) {
        setParticipants(users);
      }
    };

    const handleRoomState = (state) => {
      console.log("Room state:", state);

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

  // =========================
  // JOIN ROOM
  // =========================

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

    if (!socket.connected) {
      alert("Socket server is not connected.");
      return;
    }

    console.log("Joining room:", room);

    socket.emit("join-room", {
      roomId: room,
      name: name,
    });

    localStorage.setItem("syncspaceName", name);
    localStorage.setItem("syncspaceRoom", room);

    setUserName(name);
    setRoomId(room);
    setJoinedRoom(room);
    setActiveSection("code");
  };

  // =========================
  // LEAVE ROOM
  // =========================

  const leaveRoom = () => {
    if (joinedRoom) {
      socket.emit("leave-room", {
        roomId: joinedRoom,
      });
    }

    localStorage.removeItem("syncspaceRoom");

    setJoinedRoom("");
    setRoomId("");
    setParticipants([]);

    setLines([]);
    setHistory([]);
    setRedoStack([]);

    setCode(
      '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");'
    );

    setActiveSection("code");
  };

  // =========================
  // NAVIGATION
  // =========================

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
          console.log("Switching section:", section);
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

  // =========================
  // CONTENT
  // =========================

  const renderContent = () => {
    if (!joinedRoom) {
      return (
        <div className="workspace-empty">
          <h2>🚀 Join a workspace</h2>

          <p>
            Enter your name and Room ID above to start
            collaborating.
          </p>
        </div>
      );
    }

    switch (activeSection) {
      case "code":
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

      case "whiteboard":
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

      case "chat":
        return (
          <Chat
            joinedRoom={joinedRoom}
            socket={socket}
          />
        );

      case "team":
        return (
          <Participants
            joinedRoom={joinedRoom}
            participants={participants}
            currentSocketId={socket.id}
          />
        );

      default:
        return null;
    }
  };

  // =========================
  // SIDEBAR
  // =========================

  const sidebar = (
    <>
      <div className="workspace-brand">
        🚀 SyncSpace
      </div>

      <div className="workspace-room-name">
        📁 {joinedRoom || "No Room"}
      </div>

      <div className="workspace-label">
        Navigation
      </div>

      {navigationButton("code", "💻", "Code")}

      {navigationButton(
        "whiteboard",
        "🖍",
        "Whiteboard"
      )}

      {navigationButton("chat", "💬", "Chat")}

      {navigationButton("team", "👥", "Team")}

      {joinedRoom && (
        <button
          type="button"
          className="leave-workspace-button"
          onClick={leaveRoom}
        >
          🚪 Leave Workspace
        </button>
      )}
    </>
  );

  // =========================
  // ROOM PANEL
  // =========================

  const roomPanel = (
    <RoomPanel
      roomId={roomId}
      setRoomId={setRoomId}
      joinedRoom={joinedRoom}
      onJoinRoom={joinRoom}
      userName={userName}
      setUserName={setUserName}
    />
  );

  // =========================
  // UI
  // =========================

  return (
    <WorkspaceLayout
      status={status}
      joinedRoom={joinedRoom}
      participants={participants}
      sidebar={sidebar}
      roomPanel={roomPanel}
    >
      {renderContent()}
    </WorkspaceLayout>
  );
}

export default App;