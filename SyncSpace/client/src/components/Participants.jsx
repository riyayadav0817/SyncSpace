function Participants({
  joinedRoom,
  participants,
  currentSocketId,
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        padding: "20px",
        borderRadius: "12px",
        marginTop: "20px",
      }}
    >
      <h2>
        👥 Participants ({participants.length})
      </h2>

      {!joinedRoom ? (
        <p style={{ color: "#94a3b8" }}>
          Join a room to see participants.
        </p>
      ) : participants.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>
          Waiting for participants...
        </p>
      ) : (
        participants.map((user) => (
          <div
            key={user.socketId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 0",
              borderBottom: "1px solid #334155",
            }}
          >
            <span style={{ color: "#22c55e" }}>●</span>

            <span>{user.name}</span>

            {user.socketId === currentSocketId && (
              <span
                style={{
                  color: "#38bdf8",
                  fontSize: "13px",
                }}
              >
                You
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default Participants;