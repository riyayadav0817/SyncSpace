import { useState } from "react";

function RoomPanel({
  roomId,
  setRoomId,
  joinedRoom,
  onJoinRoom,
  userName,
  setUserName,
  onUpdateName,
}) {
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(userName);

  const startEditingName = () => {
    setNewName(userName);
    setEditingName(true);
  };

  const cancelEditingName = () => {
    setNewName(userName);
    setEditingName(false);
  };

  const saveName = () => {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      alert("Please enter your name.");
      return;
    }

    if (trimmedName === userName) {
      setEditingName(false);
      return;
    }

    setUserName(trimmedName);

    localStorage.setItem(
      "syncspaceName",
      trimmedName
    );

    if (onUpdateName) {
      onUpdateName(trimmedName);
    }

    setEditingName(false);
  };

  return (
    <div className="room-panel">

      {/* HEADER */}

      <div className="room-panel-header">
        <div>
          <h2>Collaboration Room</h2>

          <p>
            Join a room and collaborate in real time.
          </p>
        </div>
      </div>

      {/* =========================
          USER NAME
      ========================= */}

      <div className="room-field">

        <label>
          👤 Your Name
        </label>

        {!joinedRoom || editingName ? (
          <>
            <input
              type="text"
              placeholder="Enter your name"
              value={newName}
              onChange={(event) =>
                setNewName(event.target.value)
              }
              maxLength={30}
              autoFocus={editingName}
            />

            {joinedRoom && editingName && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={saveName}
                  style={{
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "7px",
                    background: "#16a34a",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ✓ Save Name
                </button>

                <button
                  type="button"
                  onClick={cancelEditingName}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #475569",
                    borderRadius: "7px",
                    background: "#1e293b",
                    color: "#e2e8f0",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={userName}
              readOnly
              style={{
                flex: 1,
              }}
            />

            <button
              type="button"
              onClick={startEditingName}
              style={{
                padding: "11px 13px",
                border: "1px solid #475569",
                borderRadius: "8px",
                background: "#1e293b",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ✏️ Edit
            </button>
          </div>
        )}

      </div>

      {/* =========================
          ROOM ID
      ========================= */}

      <div className="room-field">

        <label>
          📁 Room ID
        </label>

        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(event) =>
            setRoomId(event.target.value)
          }
          disabled={Boolean(joinedRoom)}
        />

      </div>

      {/* =========================
          JOIN
      ========================= */}

      {!joinedRoom && (
        <button
          type="button"
          className="room-join-button"
          onClick={onJoinRoom}
        >
          🚀 Join Room
        </button>
      )}

      {/* =========================
          JOINED
      ========================= */}

      {joinedRoom && (
        <div className="room-joined-box">

          <div className="room-joined-status">
            🟢 Joined Room
          </div>

          <div className="room-joined-id">
            {joinedRoom}
          </div>

          <div className="room-user">
            👤 {userName}
          </div>

        </div>
      )}

    </div>
  );
}

export default RoomPanel;