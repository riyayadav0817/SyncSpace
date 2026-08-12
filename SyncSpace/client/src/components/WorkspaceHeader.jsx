function WorkspaceHeader({
  status,
  joinedRoom,
  participants,
}) {
  return (
    <header
      style={{
        height: "70px",
        background: "#0f172a",
        borderBottom: "1px solid #1e293b",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxSizing: "border-box",
      }}
    >
      {/* LEFT SIDE */}

      <div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: "700",
          }}
        >
          {joinedRoom
            ? `Workspace ${joinedRoom}`
            : "SyncSpace Workspace"}
        </div>

        <div
          style={{
            fontSize: "12px",
            color: status.includes("Connected")
              ? "#22c55e"
              : "#facc15",
            marginTop: "4px",
          }}
        >
          ● {status}
        </div>
      </div>

      {/* RIGHT SIDE */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
        }}
      >
        <div
          style={{
            color: "#94a3b8",
          }}
        >
          👥 {participants.length} online
        </div>

        <button
          style={{
            padding: "8px 14px",
            borderRadius: "7px",
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#e2e8f0",
            cursor: "pointer",
          }}
        >
          Leave
        </button>
      </div>
    </header>
  );
}

export default WorkspaceHeader;