function DisconnectBanner({ status }) {
  const disconnected =
    status.includes("Disconnected");

  const connecting =
    status.includes("Connecting");

  if (!disconnected && !connecting) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "10px",
        textAlign: "center",
        background: disconnected ? "#7f1d1d" : "#78350f",
        color: "white",
        fontWeight: "600",
      }}
    >
      {disconnected
        ? "🔴 Connection lost. Reconnecting..."
        : "🟡 Connecting to SyncSpace server..."}
    </div>
  );
}

export default DisconnectBanner;