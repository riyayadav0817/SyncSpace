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
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

const DEFAULT_CODE =
  '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");';

function App() {
  // =========================
  // CONNECTION
  // =========================

  const [status, setStatus] = useState("Connecting...");
  const [isConnected, setIsConnected] = useState(
    socket.connected
  );

  // =========================
  // NAVIGATION
  // =========================

  const [activeSection, setActiveSection] =
    useState("code");

  // =========================
  // USER / ROOM
  // =========================

  const [userName, setUserName] = useState(
    localStorage.getItem("syncspaceName") || ""
  );

  const [roomId, setRoomId] = useState(
    localStorage.getItem("syncspaceRoom") || ""
  );

  const [joinedRoom, setJoinedRoom] = useState(
    localStorage.getItem("syncspaceRoom") || ""
  );

  const [participants, setParticipants] =
    useState([]);

  // =========================
  // WHITEBOARD
  // =========================

  const [lines, setLines] = useState([]);
  const [color, setColor] =
    useState("#2563eb");

  const [brushSize, setBrushSize] =
    useState(4);

  const [isDrawing, setIsDrawing] =
    useState(false);

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] =
    useState([]);

  // =========================
  // CODE EDITOR
  // =========================

  const [code, setCode] =
    useState(DEFAULT_CODE);

  const [language, setLanguage] =
    useState("javascript");

  // =========================
  // SOCKET EVENTS
  // =========================

  useEffect(() => {
    // =========================
    // CONNECT
    // =========================

    const handleConnect = () => {
      console.log(
        "✅ Socket connected:",
        socket.id
      );

      setIsConnected(true);
      setStatus(
        "Connected to SyncSpace Server"
      );

      const savedRoom =
        localStorage.getItem(
          "syncspaceRoom"
        );

      const savedName =
        localStorage.getItem(
          "syncspaceName"
        );

      // Rejoin previous room
      if (savedRoom && savedName) {
        console.log(
          "🔄 Rejoining room:",
          savedRoom,
          "as",
          savedName
        );

        socket.emit("join-room", {
          roomId: savedRoom,
          name: savedName,
        });

        setJoinedRoom(savedRoom);
        setRoomId(savedRoom);
        setUserName(savedName);
      }
    };

    // =========================
    // DISCONNECT
    // =========================

    const handleDisconnect = (
      reason
    ) => {
      console.log(
        "❌ Socket disconnected:",
        reason
      );

      setIsConnected(false);
      setStatus(
        "Disconnected from Server"
      );

      setParticipants([]);
    };

    // =========================
    // CONNECTION ERROR
    // =========================

    const handleConnectError = (
      error
    ) => {
      console.error(
        "❌ Socket connection error:",
        error
      );

      setIsConnected(false);
      setStatus(
        "Disconnected from Server"
      );
    };

    // =========================
    // ROOM USERS
    // =========================

    const handleRoomUsers = (
      users
    ) => {
      console.log(
        "👥 Room users:",
        users
      );

      if (Array.isArray(users)) {
        setParticipants(users);
      }
    };

    // =========================
    // ROOM STATE
    // =========================

    const handleRoomState = (
      state
    ) => {
      console.log(
        "📦 Room state:",
        state
      );

      if (!state) return;

      if (
        Array.isArray(state.lines)
      ) {
        setLines(state.lines);
      }

      if (
        typeof state.code === "string"
      ) {
        setCode(state.code);
      }
    };

    // =========================
    // DRAW LINE
    // =========================

    const handleDrawLine = (
      data
    ) => {
      if (
        !data ||
        !Array.isArray(
          data.points
        )
      ) {
        return;
      }

      setLines((previous) => [
        ...previous,
        {
          id:
            data.id ||
            `${Date.now()}-${Math.random()}`,

          points: data.points,

          color:
            data.color ||
            "#2563eb",

          brushSize:
            Number(
              data.brushSize
            ) || 4,
        },
      ]);
    };

    // =========================
    // CLEAR BOARD
    // =========================

    const handleClearBoard = () => {
      setLines([]);
      setHistory([]);
      setRedoStack([]);
    };

    // =========================
    // CODE UPDATE
    // =========================

    const handleCodeUpdate = (
      data
    ) => {
      if (
        typeof data?.code !==
        "string"
      ) {
        return;
      }

      setCode(data.code);
    };

    // =========================
    // LISTENERS
    // =========================

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "connect_error",
      handleConnectError
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

    // Already connected
    if (socket.connected) {
      handleConnect();
    }

    // =========================
    // CLEANUP
    // =========================

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
        "connect_error",
        handleConnectError
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

  // =========================
  // JOIN ROOM
  // =========================

  const joinRoom = () => {
    const name =
      userName.trim();

    const room =
      roomId.trim();

    if (!name) {
      alert(
        "Please enter your name."
      );
      return;
    }

    if (!room) {
      alert(
        "Please enter Room ID."
      );
      return;
    }

    if (!socket.connected) {
      alert(
        "SyncSpace server is not connected."
      );
      return;
    }

    console.log(
      "🚀 Joining room:",
      room,
      "as",
      name
    );

    socket.emit(
      "join-room",
      {
        roomId: room,
        name,
      }
    );

    localStorage.setItem(
      "syncspaceName",
      name
    );

    localStorage.setItem(
      "syncspaceRoom",
      room
    );

    setUserName(name);
    setRoomId(room);
    setJoinedRoom(room);

    setActiveSection("code");
  };

  // =========================
  // CHANGE NAME
  // =========================

  const changeName = (
    newName
  ) => {
    const name =
      newName.trim();

    if (!name) {
      alert(
        "Please enter a valid name."
      );
      return;
    }

    if (!joinedRoom) {
      alert(
        "Please join a room first."
      );
      return;
    }

    if (!socket.connected) {
      alert(
        "Server is not connected."
      );
      return;
    }

    console.log(
      "✏️ Changing name to:",
      name
    );

    socket.emit(
      "change-name",
      {
        roomId: joinedRoom,
        name,
      }
    );

    localStorage.setItem(
      "syncspaceName",
      name
    );

    setUserName(name);
  };

  // =========================
  // LEAVE ROOM
  // =========================

  const leaveRoom = () => {
    if (
      joinedRoom &&
      socket.connected
    ) {
      socket.emit(
        "leave-room",
        {
          roomId: joinedRoom,
        }
      );
    }

    localStorage.removeItem(
      "syncspaceRoom"
    );

    setJoinedRoom("");
    setRoomId("");

    setParticipants([]);

    setLines([]);
    setHistory([]);
    setRedoStack([]);

    setCode(DEFAULT_CODE);
    setLanguage("javascript");

    setActiveSection("code");
  };

  // =========================
  // NAVIGATION
  // =========================

  const handleNavigation = (
    section
  ) => {
    if (!joinedRoom) {
      alert(
        "Please join a workspace first."
      );
      return;
    }

    setActiveSection(section);
  };

  const navigationButton = (
    section,
    icon,
    label
  ) => {
    const active =
      activeSection === section;

    return (
      <button
        key={section}
        type="button"
        className={
          active
            ? "workspace-nav-button workspace-nav-active"
            : "workspace-nav-button"
        }
        onClick={() =>
          handleNavigation(
            section
          )
        }
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
          <div className="workspace-empty-icon">
            🚀
          </div>

          <h2>
            Join a workspace
          </h2>

          <p>
            Enter your name and Room ID
            to start collaborating with
            your team.
          </p>
        </div>
      );
    }

    switch (
      activeSection
    ) {
      case "code":
        return (
          <ErrorBoundary>
            <CodeEditor
              code={code}
              setCode={setCode}
              language={language}
              setLanguage={
                setLanguage
              }
              joinedRoom={
                joinedRoom
              }
              socket={socket}
            />
          </ErrorBoundary>
        );

      case "whiteboard":
        return (
          <ErrorBoundary>
            <Whiteboard
              joinedRoom={
                joinedRoom
              }
              lines={lines}
              setLines={setLines}
              color={color}
              setColor={setColor}
              brushSize={
                brushSize
              }
              setBrushSize={
                setBrushSize
              }
              isDrawing={
                isDrawing
              }
              setIsDrawing={
                setIsDrawing
              }
              socket={socket}
              history={history}
              setHistory={
                setHistory
              }
              redoStack={
                redoStack
              }
              setRedoStack={
                setRedoStack
              }
            />
          </ErrorBoundary>
        );

      case "chat":
        return (
          <ErrorBoundary>
            <Chat
              joinedRoom={
                joinedRoom
              }
              socket={socket}
            />
          </ErrorBoundary>
        );

      case "team":
        return (
          <ErrorBoundary>
            <Participants
              joinedRoom={
                joinedRoom
              }
              participants={
                participants
              }
              currentSocketId={
                socket.id
              }
            />
          </ErrorBoundary>
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
        📁{" "}
        {joinedRoom ||
          "No Room"}
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

      {joinedRoom && (
        <button
          type="button"
          className="leave-workspace-button"
          onClick={
            leaveRoom
          }
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
      setUserName={
        setUserName
      }
      onChangeName={
        changeName
      }
    />
  );

  // =========================
  // UI
  // =========================

  return (
    <ErrorBoundary>
      <div className="syncspace-app">

        <DisconnectBanner
          status={status}
          socket={socket}
        />

        <WorkspaceLayout
          status={status}
          joinedRoom={
            joinedRoom
          }
          participants={
            participants
          }
          sidebar={sidebar}
          roomPanel={
            roomPanel
          }
        >
          {renderContent()}
        </WorkspaceLayout>
      </div>
    </ErrorBoundary>
  );
}

export default App;