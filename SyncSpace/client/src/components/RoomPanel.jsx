function RoomPanel({
  roomId,
  setRoomId,
  joinedRoom,
  onJoinRoom,
  userName,
  setUserName,
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        padding: "20px",
        borderRadius: "12px",
        marginTop: "25px",
      }}
    >
      <h2>Collaboration Room</h2>

      {/* USER NAME */}

      <div style={{ marginBottom: "15px" }}>
        <label
          style={{
            display: "block",
            color: "#cbd5e1",
            marginBottom: "6px",
          }}
        >
          👤 Your Name
        </label>

        <input
          type="text"
          placeholder="Enter your name"
          value={userName}
          onChange={(e) =>
            setUserName(e.target.value)
          }
          disabled={Boolean(joinedRoom)}
          style={{
            padding: "12px",
            width: "220px",
            borderRadius: "8px",
            border: "none",
            outline: "none",
          }}
        />
      </div>

      {/* ROOM ID */}

      <div style={{ marginBottom: "15px" }}>
        <label
          style={{
            display: "block",
            color: "#cbd5e1",
            marginBottom: "6px",
          }}
        >
          📁 Room ID
        </label>

        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) =>
            setRoomId(e.target.value)
          }
          disabled={Boolean(joinedRoom)}
          style={{
            padding: "12px",
            width: "220px",
            borderRadius: "8px",
            border: "none",
            outline: "none",
          }}
        />
      </div>

      {/* JOIN BUTTON */}

      {!joinedRoom && (
        <button
          type="button"
          onClick={onJoinRoom}
          style={{
            padding: "12px 20px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Join Room
        </button>
      )}

      {/* JOINED MESSAGE */}

      {joinedRoom && (
        <div
          style={{
            marginTop: "15px",
            padding: "12px",
            background: "#064e3b",
            borderRadius: "8px",
          }}
        >
          <p
            style={{
              color: "#34d399",
              margin: 0,
            }}
          >
            🟢 Joined Room:{" "}
            <strong>{joinedRoom}</strong>
          </p>

          <p
            style={{
              color: "#a7f3d0",
              marginBottom: 0,
            }}
          >
            👤 User: <strong>{userName}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

export default RoomPanel;