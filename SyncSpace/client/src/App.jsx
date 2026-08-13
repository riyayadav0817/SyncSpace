
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import "./App.css";

import Register from "./components/Register";
import Login from "./components/Login";
import JoinWorkspace from "./components/JoinWorkspace";

import Participants from "./components/Participants";
import RoomPanel from "./components/RoomPanel";
import Whiteboard from "./components/Whiteboard";
import CodeEditor from "./components/CodeEditor";
import Chat from "./components/Chat";
import WorkspaceLayout from "./components/WorkspaceLayout";

// =====================================
// SOCKET
// =====================================

const socket = io("http://localhost:5000");

// =====================================
// PROTECTED ROUTE
// =====================================

function ProtectedRoute({ children }) {
  const loggedIn =
    localStorage.getItem("syncspaceLoggedIn") === "true";

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// =====================================
// WORKSPACE
// =====================================

function Workspace() {
  const navigate = useNavigate();

  const [status, setStatus] =
    useState("Connecting...");

  const [activeSection, setActiveSection] =
    useState("code");

  const [userName, setUserName] = useState(
    localStorage.getItem("syncspaceName") || ""
  );

  const [roomId, setRoomId] = useState(
    localStorage.getItem("syncspaceRoom") || ""
  );

  const [joinedRoom, setJoinedRoom] =
    useState("");

  const [participants, setParticipants] =
    useState([]);

  // =====================================
  // WHITEBOARD
  // =====================================

  const [lines, setLines] = useState([]);
  const [color, setColor] =
    useState("#2563eb");

  const [brushSize, setBrushSize] =
    useState(4);

  const [isDrawing, setIsDrawing] =
    useState(false);

  const [history, setHistory] =
    useState([]);

  const [redoStack, setRedoStack] =
    useState([]);

  // =====================================
  // CODE
  // =====================================

  const [code, setCode] = useState(
    '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");'
  );

  const [language, setLanguage] =
    useState("javascript");

  // =====================================
  // SOCKET EVENTS
  // =====================================

  useEffect(() => {
    const handleConnect = () => {
      setStatus(
        "Connected to SyncSpace Server ✅"
      );
    };

    const handleDisconnect = () => {
      setStatus(
        "Disconnected from Server ❌"
      );

      setParticipants([]);
    };

    const handleRoomUsers = (users) => {
      setParticipants(users);
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
      if (!data?.points) return;

      setLines((oldLines) => [
        ...oldLines,
        {
          points: data.points,
          color:
            data.color || "#2563eb",
          brushSize:
            data.brushSize || 4,
        },
      ]);
    };

    const handleClearBoard = () => {
      setLines([]);
      setHistory([]);
      setRedoStack([]);
    };

    const handleCodeUpdate = (data) => {
      if (
        typeof data?.code !== "string"
      ) {
        return;
      }

      setCode(data.code);
    };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "room-users",
      handleRoomUsers
    );

    socket.on(
      "room-state",
      handleRoomState
    );

    socket.on(
      "draw-line",
      handleDrawLine
    );

    socket.on(
      "clear-board",
      handleClearBoard
    );

    socket.on(
      "code-update",
      handleCodeUpdate
    );

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "room-users",
        handleRoomUsers
      );

      socket.off(
        "room-state",
        handleRoomState
      );

      socket.off(
        "draw-line",
        handleDrawLine
      );

      socket.off(
        "clear-board",
        handleClearBoard
      );

      socket.off(
        "code-update",
        handleCodeUpdate
      );
    };
  }, []);

  // =====================================
  // AUTO JOIN SAVED ROOM
  // =====================================

  useEffect(() => {
    const joinSavedRoom = () => {
      if (!userName || !roomId) {
        return;
      }

      socket.emit("join-room", {
        roomId,
        name: userName,
      });

      setJoinedRoom(roomId);
    };

    if (socket.connected) {
      joinSavedRoom();
    }

    socket.on(
      "connect",
      joinSavedRoom
    );

    return () => {
      socket.off(
        "connect",
        joinSavedRoom
      );
    };
  }, [userName, roomId]);

  // =====================================
  // JOIN ROOM
  // =====================================

  const joinRoom = () => {
    const trimmedName =
      userName.trim();

    const trimmedRoomId =
      roomId.trim();

    if (!trimmedName) {
      alert("Please enter your name");
      return;
    }

    if (!trimmedRoomId) {
      alert("Please enter Room ID");
      return;
    }

    socket.emit("join-room", {
      roomId: trimmedRoomId,
      name: trimmedName,
    });

    localStorage.setItem(
      "syncspaceName",
      trimmedName
    );

    localStorage.setItem(
      "syncspaceRoom",
      trimmedRoomId
    );

    setUserName(trimmedName);
    setRoomId(trimmedRoomId);
    setJoinedRoom(trimmedRoomId);
  };

  // =====================================
  // LEAVE WORKSPACE
  // =====================================

  const leaveWorkspace = () => {
    socket.disconnect();

    localStorage.removeItem(
      "syncspaceName"
    );

    localStorage.removeItem(
      "syncspaceRoom"
    );

    setJoinedRoom("");
    setParticipants([]);

    navigate("/join-workspace");

    setTimeout(() => {
      socket.connect();
    }, 100);
  };

  // =====================================
  // NAVIGATION
  // =====================================

  const navigationButton = (
    section,
    icon,
    label
  ) => {
    const isActive =
      activeSection === section;

    return (
      <button
        type="button"
        className={`workspace-nav-button ${
          isActive
            ? "workspace-nav-active"
            : ""
        }`}
        onClick={() =>
          setActiveSection(section)
        }
      >
        <span>{icon}</span>
        {label}
      </button>
    );
  };

  // =====================================
  // UI
  // =====================================

  return (
    <WorkspaceLayout
      status={status}
      joinedRoom={joinedRoom}
      participants={participants}
    >
      {/* NAVIGATION */}

      <div className="workspace-navigation">
        <h3 className="workspace-brand">
          🚀 SyncSpace
        </h3>

        <p className="workspace-label">
          Workspace
        </p>

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

        <button
          type="button"
          className="workspace-leave-button"
          onClick={leaveWorkspace}
        >
          🚪 Leave Workspace
        </button>
      </div>

      {/* ROOM PANEL */}

      <RoomPanel
        roomId={roomId}
        setRoomId={setRoomId}
        joinedRoom={joinedRoom}
        onJoinRoom={joinRoom}
        userName={userName}
        setUserName={setUserName}
      />

      {/* CODE */}

      {activeSection === "code" && (
        <CodeEditor
          code={code}
          setCode={setCode}
          language={language}
          setLanguage={setLanguage}
          joinedRoom={joinedRoom}
          socket={socket}
        />
      )}

      {/* WHITEBOARD */}

      {activeSection === "whiteboard" && (
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
      )}

      {/* CHAT */}

      {activeSection === "chat" && (
        <Chat
          joinedRoom={joinedRoom}
          socket={socket}
        />
      )}

      {/* TEAM */}

      {activeSection === "team" && (
        <Participants
          joinedRoom={joinedRoom}
          participants={participants}
          currentSocketId={socket.id}
        />
      )}
    </WorkspaceLayout>
  );
}

// =====================================
// APP ROUTER
// =====================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* DEFAULT */}

        <Route
          path="/"
          element={
            <Navigate
              to="/register"
              replace
            />
          }
        />

        {/* REGISTER */}

        <Route
          path="/register"
          element={<Register />}
        />

        {/* LOGIN */}

        <Route
          path="/login"
          element={<Login />}
        />

        {/* JOIN WORKSPACE */}

        <Route
          path="/join-workspace"
          element={
            <ProtectedRoute>
              <JoinWorkspace />
            </ProtectedRoute>
          }
        />

        {/* MAIN WORKSPACE */}

        <Route
          path="/workspace"
          element={
            <ProtectedRoute>
              <Workspace />
            </ProtectedRoute>
          }
        />

        {/* UNKNOWN URL */}

        <Route
          path="*"
          element={
            <Navigate
              to="/register"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;

