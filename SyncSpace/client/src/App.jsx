import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";

import Participants from "./components/Participants";
import RoomPanel from "./components/RoomPanel";
import Whiteboard from "./components/Whiteboard";
import CodeEditor from "./components/CodeEditor";
import Chat from "./components/Chat";
import WorkspaceLayout from "./components/WorkspaceLayout";
import DisconnectBanner from "./components/DisconnectBanner";
import ErrorBoundary from "./components/ErrorBoundary";

import "./App.css";

/* =====================================================
   SOCKET
===================================================== */

const socket = io("http://localhost:5000", {
  autoConnect: false,

  reconnection: true,

  reconnectionAttempts: Infinity,

  reconnectionDelay: 1000,

  reconnectionDelayMax: 5000,
});

/* =====================================================
   DEFAULT CODE
===================================================== */

const DEFAULT_CODE =
  '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");';

/* =====================================================
   APP
===================================================== */

function App() {
  /* ===================================================
     AUTH
  =================================================== */

  const [isAuthenticated, setIsAuthenticated] =
    useState(
      Boolean(
        localStorage.getItem(
          "syncspaceToken",
        ),
      ),
    );

  const [showRegister, setShowRegister] =
    useState(false);

  /* ===================================================
     CONNECTION
  =================================================== */

  const [status, setStatus] = useState(
    "Waiting for authentication...",
  );

  const [isConnected, setIsConnected] =
    useState(socket.connected);

  /* ===================================================
     USER
  =================================================== */

  const getSavedUser = () => {
    try {
      return JSON.parse(
        localStorage.getItem(
          "syncspaceUser",
        ) || "{}",
      );
    } catch {
      return {};
    }
  };

  const savedUser = getSavedUser();

  const [userName, setUserName] =
    useState(
      sessionStorage.getItem(
        "syncspaceName",
      ) ||
        savedUser?.name ||
        "",
    );

  /* ===================================================
     ROOM
  =================================================== */

  const [roomId, setRoomId] = useState(
    sessionStorage.getItem(
      "syncspaceRoom",
    ) || "",
  );

  const [joinedRoom, setJoinedRoom] =
    useState(
      sessionStorage.getItem(
        "syncspaceRoom",
      ) || "",
    );

  const [participants, setParticipants] =
    useState([]);

  /* ===================================================
     NAVIGATION
  =================================================== */

  const [activeSection, setActiveSection] =
    useState("code");

  /* ===================================================
     WHITEBOARD
  =================================================== */

  const [lines, setLines] = useState([]);

  const [color, setColor] =
    useState("#2563eb");

  const [brushSize, setBrushSize] =
    useState(4);

  const [history, setHistory] =
    useState([]);

  const [redoStack, setRedoStack] =
    useState([]);

  /* ===================================================
     CODE
  =================================================== */

  const [code, setCode] =
    useState(DEFAULT_CODE);

  const [language, setLanguage] =
    useState("javascript");

  /* ===================================================
     LOGIN
  =================================================== */

  const handleLogin = (data) => {
    if (data?.token) {
      localStorage.setItem(
        "syncspaceToken",
        data.token,
      );
    }

    if (data?.user) {
      localStorage.setItem(
        "syncspaceUser",
        JSON.stringify(data.user),
      );

      if (data.user.name) {
        setUserName(data.user.name);
      }
    }

    setShowRegister(false);
    setIsAuthenticated(true);

    setStatus(
      "Connecting to SyncSpace...",
    );
  };

  /* ===================================================
     REGISTER
  =================================================== */

  const handleRegister = (data) => {
    if (data?.token) {
      localStorage.setItem(
        "syncspaceToken",
        data.token,
      );
    }

    if (data?.user) {
      localStorage.setItem(
        "syncspaceUser",
        JSON.stringify(data.user),
      );

      if (data.user.name) {
        setUserName(data.user.name);
      }
    }

    setShowRegister(false);
    setIsAuthenticated(true);

    setStatus(
      "Connecting to SyncSpace...",
    );
  };

  /* ===================================================
     LOGOUT
  =================================================== */

  const logout = () => {
    if (socket.connected) {
      socket.disconnect();
    }

    localStorage.removeItem(
      "syncspaceToken",
    );

    localStorage.removeItem(
      "syncspaceUser",
    );

    sessionStorage.removeItem(
      "syncspaceName",
    );

    sessionStorage.removeItem(
      "syncspaceRoom",
    );

    setIsAuthenticated(false);

    setShowRegister(false);

    setUserName("");

    setRoomId("");

    setJoinedRoom("");

    setParticipants([]);

    setLines([]);

    setHistory([]);

    setRedoStack([]);

    setCode(DEFAULT_CODE);

    setLanguage("javascript");

    setActiveSection("code");

    setIsConnected(false);

    setStatus(
      "Waiting for authentication...",
    );
  };

  /* ===================================================
     CONNECT
  =================================================== */

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket.connected) {
        socket.disconnect();
      }

      return;
    }

    if (!socket.connected) {
      socket.connect();
    }
  }, [isAuthenticated]);

  /* ===================================================
     SOCKET EVENTS
  =================================================== */

  useEffect(() => {
    const handleConnect = () => {
      console.log(
        "🟢 Connected:",
        socket.id,
      );

      setIsConnected(true);

      setStatus(
        "Connected to SyncSpace Server",
      );

      const savedRoom =
        sessionStorage.getItem(
          "syncspaceRoom",
        );

      const savedName =
        sessionStorage.getItem(
          "syncspaceName",
        );

      if (
        savedRoom &&
        savedName
      ) {
        socket.emit(
          "join-room",
          {
            roomId: savedRoom,
            name: savedName,
          },
        );

        setRoomId(savedRoom);

        setJoinedRoom(savedRoom);

        setUserName(savedName);
      }
    };

    const handleDisconnect = (
      reason,
    ) => {
      console.log(
        "🔴 Disconnected:",
        reason,
      );

      setIsConnected(false);

      setStatus(
        "Disconnected from Server",
      );

      setParticipants([]);
    };

    const handleConnectError = (
      error,
    ) => {
      console.error(
        "❌ Socket error:",
        error,
      );

      setIsConnected(false);

      setStatus(
        "Unable to connect to Server",
      );
    };

    /* -----------------------------------------------
       USERS
    ----------------------------------------------- */

    const handleRoomUsers = (
      users,
    ) => {
      if (Array.isArray(users)) {
        setParticipants(users);
      }
    };

    /* -----------------------------------------------
       COMPLETE ROOM STATE
    ----------------------------------------------- */

    const handleRoomState = (
      state,
    ) => {
      console.log(
        "📦 RECEIVED ROOM STATE:",
        state,
      );

      if (!state) return;

      if (
        Array.isArray(state.lines)
      ) {
        setLines(state.lines);
      }

      if (
        typeof state.code ===
        "string"
      ) {
        setCode(state.code);
      }

      if (
        typeof state.language ===
        "string"
      ) {
        setLanguage(
          state.language,
        );
      }

      if (
        Array.isArray(
          state.redoLines,
        )
      ) {
        setRedoStack(
          state.redoLines,
        );
      } else {
        setRedoStack([]);
      }

      setHistory([]);
    };

    /* -----------------------------------------------
       DRAW
    ----------------------------------------------- */

    const handleDrawLine = (
      line,
    ) => {
      if (!line?.id) return;

      setLines(
        (previous) => {
          const exists =
            previous.some(
              (item) =>
                item.id ===
                line.id,
            );

          if (exists) {
            return previous;
          }

          return [
            ...previous,
            line,
          ];
        },
      );
    };

    /* -----------------------------------------------
       CODE
    ----------------------------------------------- */

    const handleCodeUpdate = (
      data,
    ) => {
      if (
        typeof data?.code ===
        "string"
      ) {
        setCode(data.code);
      }

      if (
        typeof data?.language ===
        "string"
      ) {
        setLanguage(
          data.language,
        );
      }
    };

    /* -----------------------------------------------
       BOARD
    ----------------------------------------------- */

    const handleBoardState = (
      data,
    ) => {
      if (!data) return;

      if (
        Array.isArray(data.lines)
      ) {
        setLines(data.lines);
      }

      if (
        Array.isArray(
          data.redoLines,
        )
      ) {
        setRedoStack(
          data.redoLines,
        );
      } else {
        setRedoStack([]);
      }
    };

    /* -----------------------------------------------
       REDO
    ----------------------------------------------- */

    const handleRedoState = (
      data,
    ) => {
      if (
        Array.isArray(
          data?.redoLines,
        )
      ) {
        setRedoStack(
          data.redoLines,
        );
      }
    };

    /* -----------------------------------------------
       CLEAR
    ----------------------------------------------- */

    const handleClear = () => {
      setLines([]);

      setRedoStack([]);

      setHistory([]);
    };

    /* -----------------------------------------------
       ERRORS
    ----------------------------------------------- */

    const handleRoomError = (
      data,
    ) => {
      alert(
        data?.message ||
          "Room error",
      );
    };

    /* -----------------------------------------------
       REGISTER
    ----------------------------------------------- */

    socket.on(
      "connect",
      handleConnect,
    );

    socket.on(
      "disconnect",
      handleDisconnect,
    );

    socket.on(
      "connect_error",
      handleConnectError,
    );

    socket.on(
      "room-users",
      handleRoomUsers,
    );

    socket.on(
      "room-state",
      handleRoomState,
    );

    socket.on(
      "draw-line",
      handleDrawLine,
    );

    socket.on(
      "code-update",
      handleCodeUpdate,
    );

    socket.on(
      "board-state",
      handleBoardState,
    );

    socket.on(
      "redo-state",
      handleRedoState,
    );

    socket.on(
      "clear-board",
      handleClear,
    );

    socket.on(
      "room-error",
      handleRoomError,
    );

    return () => {
      socket.off(
        "connect",
        handleConnect,
      );

      socket.off(
        "disconnect",
        handleDisconnect,
      );

      socket.off(
        "connect_error",
        handleConnectError,
      );

      socket.off(
        "room-users",
        handleRoomUsers,
      );

      socket.off(
        "room-state",
        handleRoomState,
      );

      socket.off(
        "draw-line",
        handleDrawLine,
      );

      socket.off(
        "code-update",
        handleCodeUpdate,
      );

      socket.off(
        "board-state",
        handleBoardState,
      );

      socket.off(
        "redo-state",
        handleRedoState,
      );

      socket.off(
        "clear-board",
        handleClear,
      );

      socket.off(
        "room-error",
        handleRoomError,
      );
    };
  }, []);

  /* ===================================================
     JOIN ROOM
  =================================================== */

  const joinRoom = () => {
    const name =
      userName.trim();

    const room =
      roomId.trim();

    if (!name) {
      alert(
        "Please enter your name.",
      );
      return;
    }

    if (!room) {
      alert(
        "Please enter Room ID.",
      );
      return;
    }

    if (!socket.connected) {
      alert(
        "Server is not connected.",
      );
      return;
    }

    console.log(
      "🚀 JOIN:",
      room,
      name,
    );

    socket.emit(
      "join-room",
      {
        roomId: room,
        name,
      },
    );

    sessionStorage.setItem(
      "syncspaceRoom",
      room,
    );

    sessionStorage.setItem(
      "syncspaceName",
      name,
    );

    setRoomId(room);

    setJoinedRoom(room);

    setUserName(name);

    setActiveSection("code");
  };

  /* ===================================================
     CHANGE NAME
  =================================================== */

  const changeName = (
    newName,
  ) => {
    const name =
      newName.trim();

    if (!name || !joinedRoom) {
      return;
    }

    socket.emit(
      "change-name",
      {
        roomId:
          joinedRoom,
        name,
      },
    );

    sessionStorage.setItem(
      "syncspaceName",
      name,
    );

    setUserName(name);
  };

  /* ===================================================
     LEAVE
  =================================================== */

  const leaveRoom = () => {
    if (
      joinedRoom &&
      socket.connected
    ) {
      socket.emit(
        "leave-room",
        {
          roomId:
            joinedRoom,
        },
      );
    }

    sessionStorage.removeItem(
      "syncspaceRoom",
    );

    sessionStorage.removeItem(
      "syncspaceName",
    );

    setJoinedRoom("");

    setRoomId("");

    setUserName("");

    setParticipants([]);

    setLines([]);

    setHistory([]);

    setRedoStack([]);

    setCode(DEFAULT_CODE);

    setLanguage("javascript");

    setActiveSection("code");
  };

  /* ===================================================
     NAVIGATION
  =================================================== */

  const handleNavigation = (
    section,
  ) => {
    if (!joinedRoom) {
      alert(
        "Please join a workspace first.",
      );
      return;
    }

    setActiveSection(section);
  };

  /* ===================================================
     AUTH
  =================================================== */

  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <Register
          onRegister={
            handleRegister
          }
          onLogin={() =>
            setShowRegister(
              false,
            )
          }
          onSwitch={() =>
            setShowRegister(
              false,
            )
          }
        />
      );
    }

    return (
      <Login
        onLogin={
          handleLogin
        }
        onRegister={() =>
          setShowRegister(
            true,
          )
        }
        onSwitch={() =>
          setShowRegister(
            true,
          )
        }
      />
    );
  }

  /* ===================================================
     CONTENT
  =================================================== */

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
            Enter your name and
            Room ID to start
            collaborating.
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
              language={
                language
              }
              setLanguage={
                setLanguage
              }
              joinedRoom={
                joinedRoom
              }
              socket={
                socket
              }
              userName={
                userName
              }
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
              setLines={
                setLines
              }
              color={color}
              setColor={
                setColor
              }
              brushSize={
                brushSize
              }
              setBrushSize={
                setBrushSize
              }
              socket={
                socket
              }
              history={
                history
              }
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
          <Chat
            joinedRoom={
              joinedRoom
            }
            socket={
              socket
            }
          />
        );

      case "team":
        return (
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
        );

      default:
        return null;
    }
  };

  /* ===================================================
     SIDEBAR
  =================================================== */

  const navigationButton = (
    section,
    icon,
    label,
  ) => (
    <button
      key={section}
      type="button"
      className={
        activeSection ===
        section
          ? "workspace-nav-button workspace-nav-active"
          : "workspace-nav-button"
      }
      onClick={() =>
        handleNavigation(
          section,
        )
      }
    >
      <span className="workspace-nav-icon">
        {icon}
      </span>

      <span>
        {label}
      </span>
    </button>
  );

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
        "Code",
      )}

      {navigationButton(
        "whiteboard",
        "🖍",
        "Whiteboard",
      )}

      {navigationButton(
        "chat",
        "💬",
        "Chat",
      )}

      {navigationButton(
        "team",
        "👥",
        "Team",
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

      <button
        type="button"
        className="leave-workspace-button"
        onClick={
          logout
        }
      >
        🔐 Logout
      </button>
    </>
  );

  const roomPanel = (
    <RoomPanel
      roomId={roomId}
      setRoomId={
        setRoomId
      }
      joinedRoom={
        joinedRoom
      }
      onJoinRoom={
        joinRoom
      }
      userName={
        userName
      }
      setUserName={
        setUserName
      }
      onChangeName={
        changeName
      }
    />
  );

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <ErrorBoundary>
      <div className="syncspace-app">
        <DisconnectBanner
          status={
            status
          }
          socket={
            socket
          }
        />

        <WorkspaceLayout
          status={
            status
          }
          joinedRoom={
            joinedRoom
          }
          participants={
            participants
          }
          sidebar={
            sidebar
          }
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