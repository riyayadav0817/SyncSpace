function Sidebar({ joinedRoom, participants }) {
  return (
    <aside
      style={{
        width: "240px",
        minHeight: "calc(100vh - 70px)",
        background: "#111827",
        borderRight: "1px solid #1f2937",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: "20px",
          fontWeight: "700",
          marginBottom: "30px",
        }}
      >
        🚀 SyncSpace
      </div>

      <div style={{ marginBottom: "25px" }}>
        <div
          style={{
            color: "#64748b",
            fontSize: "12px",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Workspace
        </div>

        <div
          style={{
            background: "#1e293b",
            padding: "12px",
            borderRadius: "8px",
            color: "#e2e8f0",
          }}
        >
          📁 {joinedRoom || "No Room"}
        </div>
      </div>

      <div style={{ marginBottom: "25px" }}>
        <div
          style={{
            color: "#64748b",
            fontSize: "12px",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Navigation
        </div>

        <div style={{ padding: "10px", color: "#e2e8f0" }}>
          💻 Code
        </div>

        <div style={{ padding: "10px", color: "#e2e8f0" }}>
          🖍 Whiteboard
        </div>

        <div style={{ padding: "10px", color: "#e2e8f0" }}>
          💬 Chat
        </div>
      </div>

      <div>
        <div
          style={{
            color: "#64748b",
            fontSize: "12px",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          Team
        </div>

        <div style={{ padding: "10px", color: "#cbd5e1" }}>
          👥 {participants.length} Online
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;