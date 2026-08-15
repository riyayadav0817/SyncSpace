import { useEffect, useState } from "react";

function DisconnectBanner({ status, socket }) {
  const [retrying, setRetrying] = useState(false);

  const safeStatus =
    typeof status === "string"
      ? status.toLowerCase()
      : "";

  const disconnected =
    safeStatus.includes("disconnected");

  const connecting =
    safeStatus.includes("connecting");

  const connected =
    safeStatus.includes("connected");

  // =========================
  // SOCKET STATUS
  // =========================

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setRetrying(false);
    };

    const handleConnectError = () => {
      setRetrying(false);
    };

    socket.on("connect", handleConnect);
    socket.on(
      "connect_error",
      handleConnectError
    );

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "connect_error",
        handleConnectError
      );
    };
  }, [socket]);

  // =========================
  // STATUS EFFECT
  // =========================

  useEffect(() => {
    if (connected) {
      setRetrying(false);
    }
  }, [connected]);

  // =========================
  // MANUAL RECONNECT
  // =========================

  const handleReconnect = () => {
    if (!socket) {
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
      console.error(
        "Reconnect failed:",
        error
      );

      setRetrying(false);
    }
  };

  // =========================
  // HIDE WHEN CONNECTED
  // =========================

  if (!disconnected && !connecting) {
    return null;
  }

  const isDisconnected = disconnected;

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

        background: isDisconnected
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
        {/* STATUS ICON */}

        <span
          style={{
            fontSize: "16px",
          }}
        >
          {isDisconnected
            ? "🔴"
            : "🟡"}
        </span>

        {/* STATUS TEXT */}

        <span>
          {isDisconnected
            ? retrying
              ? "Reconnecting to SyncSpace..."
              : "Connection lost. Trying to reconnect..."
            : "Connecting to SyncSpace server..."}
        </span>

        {/* RETRY BUTTON */}

        {isDisconnected &&
          !retrying && (
            <button
              type="button"
              onClick={
                handleReconnect
              }
              style={{
                padding:
                  "6px 12px",

                background:
                  "rgba(255,255,255,0.12)",

                color: "#fff",

                border:
                  "1px solid rgba(255,255,255,0.25)",

                borderRadius: "6px",

                cursor: "pointer",

                fontWeight: "600",

                fontSize: "12px",

                transition:
                  "background 0.2s ease",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background =
                  "rgba(255,255,255,0.22)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background =
                  "rgba(255,255,255,0.12)";
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