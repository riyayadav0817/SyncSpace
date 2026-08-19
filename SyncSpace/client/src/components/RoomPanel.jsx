import { useEffect, useState } from "react";
import "./RoomPanel.css";

function RoomPanel({
  roomId,
  setRoomId,
  joinedRoom,
  onCreateRoom,
  onJoinRoom,
  userName,
  setUserName,
}) {
  const [mode, setMode] = useState("create");
  const [newName, setNewName] = useState(userName || "");

  useEffect(() => {
    setNewName(userName || "");
  }, [userName]);

  /* =====================================================
     NAME CHANGE
  ===================================================== */

  const handleNameChange = (event) => {
    const value = event.target.value;

    setNewName(value);
    setUserName(value);
  };

  /* =====================================================
     CREATE ROOM
  ===================================================== */

  const handleCreateRoom = () => {
    const name = newName.trim();

    if (!name) {
      alert("Please enter your name first.");
      return;
    }

    onCreateRoom(name);
  };

  /* =====================================================
     JOIN ROOM
  ===================================================== */

  const handleJoinRoom = () => {
    const name = newName.trim();
    const room = roomId.trim().toUpperCase();

    if (!name) {
      alert("Please enter your name first.");
      return;
    }

    if (!room) {
      alert("Please enter Room ID.");
      return;
    }

    onJoinRoom(name, room);
  };

  /* =====================================================
     ENTER KEY
  ===================================================== */

  const handleRoomKeyDown = (event) => {
    if (event.key === "Enter") {
      handleJoinRoom();
    }
  };

  /* =====================================================
     IF ALREADY JOINED
     
     Normally App.jsx handles the active-room dashboard,
     but this keeps RoomPanel safe if reused elsewhere.
  ===================================================== */

  if (joinedRoom) {
    return (
      <div className="room-panel room-panel-joined">
        <div className="room-panel-header">
          <div>
            <div className="room-panel-eyebrow">
              WORKSPACE
            </div>

            <h2>{joinedRoom}</h2>

            <p>
              Your SyncSpace workspace is live.
            </p>
          </div>

          <div className="room-live-badge">
            <span />
            Live
          </div>
        </div>

        <div className="room-id-card">
          <div className="room-id-info">
            <span className="room-card-label">
              ROOM ID
            </span>

            <strong>{joinedRoom}</strong>
          </div>
        </div>

        <div className="room-connected-box">
          <div className="room-connected-icon">
            🟢
          </div>

          <div>
            <strong>
              Connected to workspace
            </strong>

            <span>
              Real-time collaboration is active.
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     CREATE / JOIN PANEL
  ===================================================== */

  return (
    <div className="room-panel room-panel-dashboard">
      {/* HEADER */}

      <div className="room-panel-header">
        <div>
          <div className="room-panel-eyebrow">
            SYNCSpace WORKSPACE
          </div>

          <h2>Start collaborating</h2>

          <p>
            Create a new workspace or join an
            existing one with a Room ID.
          </p>
        </div>

        <div className="room-dashboard-icon">
          🚀
        </div>
      </div>

      {/* USER NAME */}

      <div className="room-field">
        <label htmlFor="syncspace-name">
          👤 Your Name
        </label>

        <input
          id="syncspace-name"
          type="text"
          placeholder="Enter your name"
          value={newName}
          onChange={handleNameChange}
          maxLength={30}
          autoComplete="name"
        />
      </div>

      {/* MODE TABS */}

      <div className="room-mode-tabs">
        <button
          type="button"
          className={
            mode === "create"
              ? "room-mode-tab active"
              : "room-mode-tab"
          }
          onClick={() => setMode("create")}
        >
          ✨ Create Room
        </button>

        <button
          type="button"
          className={
            mode === "join"
              ? "room-mode-tab active"
              : "room-mode-tab"
          }
          onClick={() => setMode("join")}
        >
          🔑 Join Room
        </button>
      </div>

      {/* =================================================
         CREATE
      ================================================= */}

      {mode === "create" && (
        <div className="room-mode-content">
          <div className="room-action-card">
            <div className="room-action-icon">
              🚀
            </div>

            <div>
              <h3>
                Create a new workspace
              </h3>

              <p>
                We'll generate a unique Room ID
                automatically for you.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="room-primary-button"
            onClick={handleCreateRoom}
          >
            🚀 Create New Room
          </button>
        </div>
      )}

      {/* =================================================
         JOIN
      ================================================= */}

      {mode === "join" && (
        <div className="room-mode-content">
          <div className="room-field">
            <label htmlFor="syncspace-room-id">
              📁 Room ID
            </label>

            <input
              id="syncspace-room-id"
              type="text"
              placeholder="Example: ROOM-A1B2C3"
              value={roomId}
              onChange={(event) =>
                setRoomId(
                  event.target.value.toUpperCase()
                )
              }
              onKeyDown={handleRoomKeyDown}
              maxLength={50}
              autoComplete="off"
            />
          </div>

          <button
            type="button"
            className="room-primary-button"
            onClick={handleJoinRoom}
          >
            🔗 Join Workspace
          </button>
        </div>
      )}

      {/* =================================================
         FEATURES
      ================================================= */}

      <div className="room-dashboard-features">
        <div>
          <span>💻</span>
          <strong>Live Code</strong>
        </div>

        <div>
          <span>🖍</span>
          <strong>Whiteboard</strong>
        </div>

        <div>
          <span>💬</span>
          <strong>Team Chat</strong>
        </div>

        <div>
          <span>👥</span>
          <strong>Real-time Team</strong>
        </div>
      </div>
    </div>
  );
}

export default RoomPanel;