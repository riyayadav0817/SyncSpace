import { useEffect, useState } from "react";
import { io } from "socket.io-client";

import ResetPassword from "./ResetPassword";
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

const socket = io("https://syncspace-8lew.onrender.com", {
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
   ROOM ID
===================================================== */

const generateRoomId = () => {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < 6; i += 1) {
    result += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return `ROOM-${result}`;
};

/* =====================================================
   SAVED USER
===================================================== */

const getSavedUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem("syncspaceUser") || "{}"
    );
  } catch {
    return {};
  }
};

/* =====================================================
   APP
===================================================== */

function App() {
  /* ===================================================
     RESET PASSWORD
  =================================================== */

  const isResetPasswordPage =
    window.location.pathname === "/reset-password";

  /* ===================================================
     AUTH
  =================================================== */

  const [isAuthenticated, setIsAuthenticated] =
    useState(
      Boolean(
        localStorage.getItem("syncspaceToken")
      )
    );

  const [showRegister, setShowRegister] =
    useState(false);

  const savedUser = getSavedUser();

  /* ===================================================
     CONNECTION
  =================================================== */

  const [status, setStatus] = useState(
    "Waiting for authentication..."
  );

  const [isConnected, setIsConnected] =
    useState(socket.connected);

  /* ===================================================
     USER
  =================================================== */

  const [userName, setUserName] = useState(
    sessionStorage.getItem("syncspaceName") ||
      savedUser?.name ||
      ""
  );

  /* ===================================================
     ROOM
  =================================================== */

  const savedRoom =
    sessionStorage.getItem("syncspaceRoom") || "";

  const [roomId, setRoomId] =
    useState(savedRoom);

  const [joinedRoom, setJoinedRoom] =
    useState(savedRoom);

  const [participants, setParticipants] =
    useState([]);

  /* ===================================================
     DASHBOARD
  =================================================== */

  const [showDashboard, setShowDashboard] =
    useState(!savedRoom);

  const [inviteCopied, setInviteCopied] =
    useState(false);

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
     AUTH HANDLERS
  =================================================== */

  const handleLogin = (data) => {
    if (data?.token) {
      localStorage.setItem(
        "syncspaceToken",
        data.token
      );
    }

    if (data?.user) {
      localStorage.setItem(
        "syncspaceUser",
        JSON.stringify(data.user)
      );

      if (data.user.name) {
        setUserName(data.user.name);

        sessionStorage.setItem(
          "syncspaceName",
          data.user.name
        );
      }
    }

    setShowRegister(false);
    setIsAuthenticated(true);
    setStatus("Connecting to SyncSpace...");
  };

  const handleRegister = (data) => {
    if (data?.token) {
      localStorage.setItem(
        "syncspaceToken",
        data.token
      );
    }

    if (data?.user) {
      localStorage.setItem(
        "syncspaceUser",
        JSON.stringify(data.user)
      );

      if (data.user.name) {
        setUserName(data.user.name);

        sessionStorage.setItem(
          "syncspaceName",
          data.user.name
        );
      }
    }

    setShowRegister(false);
    setIsAuthenticated(true);
    setStatus("Connecting to SyncSpace...");
  };

  /* ===================================================
     LOGOUT
  =================================================== */

  const logout = () => {
    if (socket.connected) {
      socket.disconnect();
    }

    localStorage.removeItem("syncspaceToken");
    localStorage.removeItem("syncspaceUser");

    sessionStorage.removeItem("syncspaceName");
    sessionStorage.removeItem("syncspaceRoom");

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

    setShowDashboard(true);

    setStatus("Waiting for authentication...");
  };

  /* ===================================================
     INVITE ROOM DETECTION
  =================================================== */

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const invitedRoom = params.get("room");

    if (!invitedRoom) {
      return;
    }

    const normalizedRoom =
      invitedRoom.trim().toUpperCase();

    if (!normalizedRoom) {
      return;
    }

    setRoomId(normalizedRoom);
    setShowDashboard(true);

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }, []);

  /* ===================================================
     CONNECT SOCKET
  =================================================== */

  useEffect(() => {
    if (isResetPasswordPage) {
      if (socket.connected) {
        socket.disconnect();
      }

      return;
    }

    if (!isAuthenticated) {
      if (socket.connected) {
        socket.disconnect();
      }

      return;
    }

    if (!socket.connected) {
      socket.connect();
    }
  }, [
    isAuthenticated,
    isResetPasswordPage,
  ]);

  /* ===================================================
     SOCKET EVENTS
  =================================================== */

  useEffect(() => {
    if (isResetPasswordPage) {
      return undefined;
    }

    const handleConnect = () => {
      console.log(
        "🟢 Connected:",
        socket.id
      );

      setIsConnected(true);
      setStatus(
        "Connected to SyncSpace Server"
      );

      const savedRoom =
        sessionStorage.getItem(
          "syncspaceRoom"
        );

      const savedName =
        sessionStorage.getItem(
          "syncspaceName"
        );

      if (savedRoom && savedName) {
        socket.emit("join-room", {
          roomId: savedRoom,
          name: savedName,
        });

        setRoomId(savedRoom);
        setJoinedRoom(savedRoom);
        setUserName(savedName);
        setShowDashboard(false);
      }
    };

    const handleDisconnect = (reason) => {
      console.log(
        "🔴 Disconnected:",
        reason
      );

      setIsConnected(false);
      setStatus(
        "Disconnected from Server"
      );

      setParticipants([]);
    };

    const handleConnectError = (error) => {
      console.error(
        "❌ Socket error:",
        error
      );

      setIsConnected(false);
      setStatus(
        "Unable to connect to Server"
      );
    };

    const handleRoomUsers = (users) => {
      if (Array.isArray(users)) {
        setParticipants(users);
      }
    };

    const handleRoomState = (state) => {
      if (!state) {
        return;
      }

      if (Array.isArray(state.lines)) {
        setLines(state.lines);
      }

      if (typeof state.code === "string") {
        setCode(state.code);
      }

      if (
        typeof state.language === "string"
      ) {
        setLanguage(state.language);
      }

      if (Array.isArray(state.redoLines)) {
        setRedoStack(state.redoLines);
      } else {
        setRedoStack([]);
      }

      setHistory([]);
    };

    const handleDrawLine = (line) => {
      if (!line?.id) {
        return;
      }

      setLines((previous) => {
        const exists = previous.some(
          (item) => item.id === line.id
        );

        if (exists) {
          return previous;
        }

        return [...previous, line];
      });
    };

    const handleCodeUpdate = (data) => {
      if (typeof data?.code === "string") {
        setCode(data.code);
      }

      if (
        typeof data?.language === "string"
      ) {
        setLanguage(data.language);
      }
    };

    const handleBoardState = (data) => {
      if (!data) {
        return;
      }

      if (Array.isArray(data.lines)) {
        setLines(data.lines);
      }

      if (Array.isArray(data.redoLines)) {
        setRedoStack(data.redoLines);
      } else {
        setRedoStack([]);
      }
    };

    const handleRedoState = (data) => {
      if (
        Array.isArray(data?.redoLines)
      ) {
        setRedoStack(data.redoLines);
      }
    };

    const handleClear = () => {
      setLines([]);
      setRedoStack([]);
      setHistory([]);
    };

    const handleRoomError = (data) => {
      alert(
        data?.message || "Room error"
      );
    };

    const handleNameChanged = (data) => {
      if (
        typeof data?.name === "string"
      ) {
        setUserName(data.name);

        sessionStorage.setItem(
          "syncspaceName",
          data.name
        );
      }
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
      "code-update",
      handleCodeUpdate
    );

    socket.on(
      "board-state",
      handleBoardState
    );

    socket.on(
      "redo-state",
      handleRedoState
    );

    socket.on(
      "clear-board",
      handleClear
    );

    socket.on(
      "room-error",
      handleRoomError
    );

    socket.on(
      "name-changed",
      handleNameChanged
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
        "code-update",
        handleCodeUpdate
      );

      socket.off(
        "board-state",
        handleBoardState
      );

      socket.off(
        "redo-state",
        handleRedoState
      );

      socket.off(
        "clear-board",
        handleClear
      );

      socket.off(
        "room-error",
        handleRoomError
      );

      socket.off(
        "name-changed",
        handleNameChanged
      );
    };
  }, [isResetPasswordPage]);

  /* ===================================================
     CREATE ROOM
  =================================================== */

  const createRoom = (nameFromPanel) => {
    const name =
      (
        nameFromPanel ||
        userName
      ).trim();

    if (!name) {
      alert(
        "Please enter your name first."
      );

      return;
    }

    const newRoomId =
      generateRoomId();

    setUserName(name);
    setRoomId(newRoomId);
    setJoinedRoom(newRoomId);

    sessionStorage.setItem(
      "syncspaceName",
      name
    );

    sessionStorage.setItem(
      "syncspaceRoom",
      newRoomId
    );

    setActiveSection("code");
    setShowDashboard(true);

    const joinCreatedRoom = () => {
      socket.emit("join-room", {
        roomId: newRoomId,
        name,
      });
    };

    if (!socket.connected) {
      socket.once(
        "connect",
        joinCreatedRoom
      );

      socket.connect();
    } else {
      joinCreatedRoom();
    }
  };

  /* ===================================================
     JOIN ROOM
  =================================================== */

  const joinRoom = (
    nameFromPanel,
    roomFromPanel
  ) => {
    const name =
      (
        nameFromPanel ||
        userName
      ).trim();

    const room =
      (
        roomFromPanel ||
        roomId
      ).trim().toUpperCase();

    if (!name) {
      alert(
        "Please enter your name first."
      );

      return;
    }

    if (!room) {
      alert(
        "Please enter Room ID."
      );

      return;
    }

    setUserName(name);
    setRoomId(room);
    setJoinedRoom(room);

    sessionStorage.setItem(
      "syncspaceName",
      name
    );

    sessionStorage.setItem(
      "syncspaceRoom",
      room
    );

    setActiveSection("code");
    setShowDashboard(true);

    const emitJoin = () => {
      socket.emit("join-room", {
        roomId: room,
        name,
      });
    };

    if (!socket.connected) {
      socket.once(
        "connect",
        emitJoin
      );

      socket.connect();

      return;
    }

    emitJoin();
  };

  /* ===================================================
     CHANGE NAME
  =================================================== */

  const changeName = (newName) => {
    const name =
      newName.trim();

    if (!name) {
      return;
    }

    setUserName(name);

    sessionStorage.setItem(
      "syncspaceName",
      name
    );

    if (
      joinedRoom &&
      socket.connected
    ) {
      socket.emit("change-name", {
        roomId: joinedRoom,
        name,
      });
    }
  };

  /* ===================================================
     COPY ROOM ID
  =================================================== */

  const copyRoomId = async () => {
    if (!joinedRoom) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        joinedRoom
      );

      alert("Room ID copied!");
    } catch {
      alert(
        `Room ID:\n${joinedRoom}`
      );
    }
  };

  /* ===================================================
     COPY INVITE LINK
  =================================================== */

  const copyInviteLink = async () => {
    if (!joinedRoom) {
      return;
    }

    const inviteUrl =
      `${window.location.origin}/?room=${encodeURIComponent(
        joinedRoom
      )}`;

    try {
      await navigator.clipboard.writeText(
        inviteUrl
      );

      setInviteCopied(true);

      setTimeout(() => {
        setInviteCopied(false);
      }, 2000);
    } catch {
      window.prompt(
        "Copy this invite link:",
        inviteUrl
      );
    }
  };

  /* ===================================================
     LEAVE ROOM
  =================================================== */

  const leaveRoom = () => {
    if (
      joinedRoom &&
      socket.connected
    ) {
      socket.emit("leave-room", {
        roomId: joinedRoom,
      });
    }

    sessionStorage.removeItem(
      "syncspaceRoom"
    );

    sessionStorage.removeItem(
      "syncspaceName"
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

    setShowDashboard(true);
  };

  /* ===================================================
     NAVIGATION
  =================================================== */

  const handleNavigation = (
    section
  ) => {
    if (!joinedRoom) {
      alert(
        "Please join a workspace first."
      );

      return;
    }

    setShowDashboard(false);
    setActiveSection(section);
  };

  /* ===================================================
     RESET PASSWORD
  =================================================== */

  if (isResetPasswordPage) {
    return <ResetPassword />;
  }

  /* ===================================================
     AUTH SCREEN
  =================================================== */

  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <Register
          onRegister={handleRegister}
          onLogin={() =>
            setShowRegister(false)
          }
          onSwitch={() =>
            setShowRegister(false)
          }
        />
      );
    }

    return (
      <Login
        onLogin={handleLogin}
        onRegister={() =>
          setShowRegister(true)
        }
        onSwitch={() =>
          setShowRegister(true)
        }
      />
    );
  }

  /* ===================================================
     DASHBOARD
  =================================================== */

  const renderDashboard = () => {
    /* =================================================
       NO ROOM
       
       IMPORTANT:
       RoomPanel is the ONLY place where Create/Join
       Room UI exists.
    ================================================= */

    if (!joinedRoom) {
      return (
        <RoomPanel
          roomId={roomId}
          setRoomId={setRoomId}
          joinedRoom={joinedRoom}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          userName={userName}
          setUserName={setUserName}
        />
      );
    }

    /* =================================================
       ACTIVE ROOM
    ================================================= */

    return (
      <div className="room-dashboard active-room-dashboard">
        <div className="room-dashboard-header active-room-header">
          <div>
            <div className="room-dashboard-badge">
              🟢 ROOM ACTIVE
            </div>

            <h1>{joinedRoom}</h1>

            <p>
              Your SyncSpace workspace is
              live. Share the Room ID with
              your team.
            </p>
          </div>

          <button
            type="button"
            className="dashboard-primary-button"
            onClick={() => {
              setShowDashboard(false);
              setActiveSection("code");
            }}
          >
            Open Workspace →
          </button>
        </div>

        {/* ROOM + INVITE */}

        <div className="room-dashboard-grid">
          <div className="room-dashboard-card">
            <div className="dashboard-card-icon">
              🔑
            </div>

            <h2>Room ID</h2>

            <div className="room-id-display">
              {joinedRoom}
            </div>

            <button
              type="button"
              className="dashboard-secondary-button"
              onClick={copyRoomId}
            >
              📋 Copy Room ID
            </button>
          </div>

          <div className="room-dashboard-card create-room-card">
            <div className="dashboard-card-icon">
              🔗
            </div>

            <h2>Invite Teammates</h2>

            <p>
              Share this link with your
              collaborators.
            </p>

            <button
              type="button"
              className="dashboard-primary-button"
              onClick={copyInviteLink}
            >
              {inviteCopied
                ? "✓ Invite Link Copied"
                : "🔗 Copy Invite Link"}
            </button>
          </div>
        </div>

        {/* USER */}

        <div className="dashboard-user-card">
          <span>👤</span>

          <div>
            <small>
              COLLABORATING AS
            </small>

            <strong>
              {userName ||
                "Collaborator"}
            </strong>
          </div>
        </div>

        {/* STATS */}

        <div className="dashboard-stats">
          <div className="dashboard-stat-card">
            <span>👥</span>

            <div>
              <small>
                PARTICIPANTS
              </small>

              <strong>
                {participants.length}
              </strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <span>💻</span>

            <div>
              <small>
                LANGUAGE
              </small>

              <strong>
                {language}
              </strong>
            </div>
          </div>

          <div className="dashboard-stat-card">
            <span>
              {isConnected
                ? "🟢"
                : "🔴"}
            </span>

            <div>
              <small>
                SERVER
              </small>

              <strong>
                {isConnected
                  ? "Online"
                  : "Offline"}
              </strong>
            </div>
          </div>
        </div>

        {/* CONNECTION */}

        <div className="dashboard-connected-card">
          <div className="dashboard-connected-icon">
            🟢
          </div>

          <div>
            <strong>
              Connected to workspace
            </strong>

            <p>
              Real-time collaboration is
              active.
            </p>
          </div>
        </div>
      </div>
    );
  };

  /* ===================================================
     CONTENT
  =================================================== */

  const renderContent = () => {
    if (
      showDashboard ||
      !joinedRoom
    ) {
      return renderDashboard();
    }

    switch (activeSection) {
      case "code":
        return (
          <ErrorBoundary>
            <CodeEditor
              code={code}
              setCode={setCode}
              language={language}
              setLanguage={setLanguage}
              joinedRoom={joinedRoom}
              socket={socket}
              userName={userName}
            />
          </ErrorBoundary>
        );

      case "whiteboard":
        return (
          <ErrorBoundary>
            <Whiteboard
              joinedRoom={joinedRoom}
              lines={lines}
              setLines={setLines}
              color={color}
              setColor={setColor}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              socket={socket}
              history={history}
              setHistory={setHistory}
              redoStack={redoStack}
              setRedoStack={setRedoStack}
            />
          </ErrorBoundary>
        );

      case "chat":
        return (
          <ErrorBoundary>
            <Chat
              joinedRoom={joinedRoom}
              socket={socket}
            />
          </ErrorBoundary>
        );

      case "team":
        return (
          <ErrorBoundary>
            <Participants
              joinedRoom={joinedRoom}
              participants={participants}
              currentSocketId={socket.id}
            />
          </ErrorBoundary>
        );

      default:
        return renderDashboard();
    }
  };

  /* ===================================================
     NAVIGATION BUTTON
  =================================================== */

  const navigationButton = (
    section,
    icon,
    label
  ) => (
    <button
      key={section}
      type="button"
      className={
        activeSection === section &&
        !showDashboard
          ? "workspace-nav-button workspace-nav-active"
          : "workspace-nav-button"
      }
      onClick={() =>
        handleNavigation(section)
      }
    >
      <span className="workspace-nav-icon">
        {icon}
      </span>

      <span>{label}</span>
    </button>
  );

  /* ===================================================
     SIDEBAR
  =================================================== */

  const sidebar = (
    <>
      <div className="workspace-brand">
        <span className="workspace-brand-icon">
          🚀
        </span>

        <span>SyncSpace</span>
      </div>

      <button
        type="button"
        className="workspace-room-name"
        onClick={() =>
          setShowDashboard(true)
        }
      >
        <span>📁</span>

        <span>
          {joinedRoom ||
            "Dashboard"}
        </span>
      </button>

      {joinedRoom && (
        <>
          <div className="workspace-label">
            Workspace
          </div>

          <button
            type="button"
            className={
              showDashboard
                ? "workspace-nav-button workspace-nav-active"
                : "workspace-nav-button"
            }
            onClick={() =>
              setShowDashboard(true)
            }
          >
            <span className="workspace-nav-icon">
              🏠
            </span>

            <span>Dashboard</span>
          </button>

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
        </>
      )}

      {joinedRoom && (
        <button
          type="button"
          className="leave-workspace-button"
          onClick={leaveRoom}
        >
          🚪 Leave Workspace
        </button>
      )}

      <button
        type="button"
        className="logout-workspace-button"
        onClick={logout}
      >
        🔐 Logout
      </button>
    </>
  );

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <ErrorBoundary>
      <div className="syncspace-app">
        <DisconnectBanner
          status={status}
          socket={socket}
        />

        <WorkspaceLayout
          status={status}
          joinedRoom={joinedRoom}
          participants={participants}
          sidebar={sidebar}
          roomPanel={null}
          onLeave={leaveRoom}
        >
          {renderContent()}
        </WorkspaceLayout>
      </div>
    </ErrorBoundary>
  );
}

export default App;