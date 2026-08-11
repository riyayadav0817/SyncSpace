function RoomPanel({
  roomId,
  setRoomId,
  joinedRoom,
  onJoinRoom,
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

      <input
        type="text"
        placeholder="Enter Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        style={{
          padding: "12px",
          width: "220px",
          borderRadius: "8px",
          border: "none",
          marginRight: "10px",
        }}
      />

      <button
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

      {joinedRoom && (
        <p
          style={{
            color: "#38bdf8",
            marginTop: "15px",
          }}
        >
          🟢 Joined Room: <strong>{joinedRoom}</strong>
        </p>
      )}
    </div>
  );
}

export default RoomPanel;