import { useEffect, useState } from "react";

function DisconnectBanner({ status, socket }) {
  const [retrying, setRetrying] = useState(false);

  const normalizedStatus =
    typeof status === "string"
      ? status.toLowerCase()
      : "";

  const disconnected =
    normalizedStatus.includes("disconnected");

  const connecting =
    normalizedStatus.includes("connecting");

  const connected =
    normalizedStatus.includes("connected");

  useEffect(() => {
    if (connected) {
      setRetrying(false);
    }
  }, [connected]);

  const handleReconnect = () => {
    if (!socket) {
      console.warn("Socket instance not available.");
      return;
    }

    if (socket.connected) {
      setRetrying(false);
      return;
    }

    setRetrying(true);

    try {
      socket.connect();
    } catch (error) {
      console.error("Reconnect failed:", error);
      setRetrying(false);
    }
  };

  if (!disconnected && !connecting) {
    return null;
  }

  const showDisconnected = disconnected && !connecting;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        padding: "10px 16px",

        background: showDisconnected
          ? "linear-gradient(90deg, #7f1d1d, #991b1b)"
          : "linear-gradient(90deg, #78350f, #92400e)",

        color: "#fff",

        borderBottom:
          "1px solid rgba(255,255,255,0.12)",

        boxShadow:
          "0 4px 15px rgba(0,0,0,0.25)",

        fontFamily:
          "Inter, Arial, sans-serif",

        fontSize: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "16px" }}>
          {showDisconnected ? "🔴" : "🟡"}
        </span>

        <span>
          {showDisconnected
            ? retrying
              ? "Reconnecting to SyncSpace..."
              : "Connection lost. Trying to reconnect..."
            : "Connecting to SyncSpace server..."}
        </span>

        {showDisconnected && !retrying && (
          <button
            type="button"
            onClick={handleReconnect}
            disabled={!socket}
            style={{
              padding: "6px 12px",

              background:
                "rgba(255,255,255,0.12)",

              color: "#fff",

              border:
                "1px solid rgba(255,255,255,0.25)",

              borderRadius: "6px",

              cursor: socket
                ? "pointer"
                : "not-allowed",

              fontWeight: "600",
              fontSize: "12px",
            }}
          >
            ↻ Retry
          </button>
        )}
      </div>
    </div>
  );
}

export default DisconnectBanner;