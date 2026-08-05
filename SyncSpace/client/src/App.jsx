import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    socket.on("connect", () => {
      setStatus("Connected to SyncSpace Server ✅");
    });

    return () => {
      socket.off("connect");
    };
  }, []);

  return (
    <div style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>🚀 SyncSpace</h1>

      <h2 style={{ color: "green" }}>{status}</h2>

      <div style={{ display: "flex", gap: "20px", marginTop: "30px" }}>
        <div
          style={{
            width: "50%",
            height: "300px",
            border: "2px solid black",
            padding: "20px",
          }}
        >
          <h3>🖍 Whiteboard</h3>
        </div>

        <div
          style={{
            width: "50%",
            height: "300px",
            border: "2px solid black",
            padding: "20px",
          }}
        >
          <h3>💻 Code Editor</h3>
        </div>
      </div>
    </div>
  );
}

export default App;