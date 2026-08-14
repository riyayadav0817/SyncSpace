function RoomPanel({
  roomId,
  setRoomId,
  joinedRoom,
  onJoinRoom,
  userName,
  setUserName,
}) {
  return (
    <div className="room-panel">

      <div className="room-panel-header">
        <div>
          <h2>Collaboration Room</h2>

          <p>
            Join a room and collaborate in real time.
          </p>
        </div>
      </div>

      {/* USER */}

      <div className="room-field">

        <label>
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
        />

      </div>

      {/* ROOM */}

      <div className="room-field">

        <label>
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
        />

      </div>

      {/* JOIN */}

      {!joinedRoom && (
        <button
          type="button"
          className="room-join-button"
          onClick={onJoinRoom}
        >
          🚀 Join Room
        </button>
      )}

      {/* JOINED */}

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