import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Stage, Layer, Line } from "react-konva";
import Editor from "@monaco-editor/react";

const socket = io("http://localhost:5000");

function App() {
  const [status, setStatus] = useState("Connecting...");
  const [roomId, setRoomId] = useState("");
  const [joinedRoom, setJoinedRoom] = useState("");

  // Whiteboard
  const [lines, setLines] = useState([]);
  const [color, setColor] = useState("#2563eb");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);

  // Code Editor
  const [code, setCode] = useState(
    '// Welcome to SyncSpace\nconsole.log("Hello SyncSpace!");'
  );
  const [language, setLanguage] = useState("javascript");

  useEffect(() => {
    socket.on("connect", () => {
      setStatus("Connected to SyncSpace Server ✅");
    });

    socket.on("disconnect", () => {
      setStatus("Disconnected from Server ❌");
    });

    // Receive whiteboard drawing
    socket.on("draw-line", (data) => {
      setLines((oldLines) => [
        ...oldLines,
        {
          points: data.points,
          color: data.color,
          brushSize: data.brushSize,
        },
      ]);
    });

    // Receive clear board
    socket.on("clear-board", () => {
      setLines([]);
    });

    // Receive code from another user
    socket.on("code-update", (data) => {
      setCode(data.code);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("draw-line");
      socket.off("clear-board");
      socket.off("code-update");
    };
  }, []);

  // Join room
  const joinRoom = () => {
    if (!roomId.trim()) {
      alert("Please enter a Room ID");
      return;
    }

    socket.emit("join-room", roomId);
    setJoinedRoom(roomId);
  };

  // =========================
  // WHITEBOARD
  // =========================

  const startDrawing = (event) => {
    if (!joinedRoom) {
      alert("Please join a room first");
      return;
    }

    setIsDrawing(true);

    const stage = event.target.getStage();
    const point = stage.getPointerPosition();

    setLines((oldLines) => [
      ...oldLines,
      {
        points: [point.x, point.y],
        color,
        brushSize,
      },
    ]);
  };

  const draw = (event) => {
    if (!isDrawing) return;

    const stage = event.target.getStage();
    const point = stage.getPointerPosition();

    setLines((oldLines) => {
      const lastLine = oldLines[oldLines.length - 1];

      if (!lastLine) return oldLines;

      const updatedLine = {
        ...lastLine,
        points: [...lastLine.points, point.x, point.y],
      };

      return [...oldLines.slice(0, -1), updatedLine];
    });
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    setLines((currentLines) => {
      const lastLine = currentLines[currentLines.length - 1];

      if (!lastLine) return currentLines;

      socket.emit("draw-line", {
        roomId: joinedRoom,
        points: lastLine.points,
        color: lastLine.color,
        brushSize: lastLine.brushSize,
      });

      return currentLines;
    });
  };

  const clearBoard = () => {
    setLines([]);

    if (joinedRoom) {
      socket.emit("clear-board", joinedRoom);
    }
  };

  // =========================
  // CODE EDITOR
  // =========================

  const handleCodeChange = (value) => {
    const newCode = value || "";

    setCode(newCode);

    if (joinedRoom) {
      socket.emit("code-change", {
        roomId: joinedRoom,
        code: newCode,
      });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "auto",
        }}
      >
        {/* HEADER */}

        <h1
          style={{
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          🚀 SyncSpace
        </h1>

        <p
          style={{
            textAlign: "center",
            color: status.includes("Connected")
              ? "#22c55e"
              : "#facc15",
            fontWeight: "bold",
          }}
        >
          {status}
        </p>

        {/* ROOM */}

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
            onClick={joinRoom}
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

        {/* WHITEBOARD */}

        <div
          style={{
            background: "#1e293b",
            padding: "20px",
            borderRadius: "12px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "15px",
              marginBottom: "15px",
            }}
          >
            <h2>🖍 Whiteboard</h2>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                flexWrap: "wrap",
              }}
            >
              <label>
                Color:{" "}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </label>

              <label>
                Brush:{" "}
                <select
                  value={brushSize}
                  onChange={(e) =>
                    setBrushSize(Number(e.target.value))
                  }
                >
                  <option value={2}>Small</option>
                  <option value={4}>Medium</option>
                  <option value={8}>Large</option>
                  <option value={14}>Extra Large</option>
                </select>
              </label>

              <button
                onClick={clearBoard}
                style={{
                  padding: "8px 15px",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div
            style={{
              background: "white",
              borderRadius: "8px",
              overflow: "auto",
            }}
          >
            <Stage
              width={1100}
              height={500}
              onMouseDown={startDrawing}
              onMousemove={draw}
              onMouseup={stopDrawing}
              style={{
                cursor: "crosshair",
              }}
            >
              <Layer>
                {lines.map((line, index) => (
                  <Line
                    key={index}
                    points={line.points}
                    stroke={line.color}
                    strokeWidth={line.brushSize}
                    lineCap="round"
                    lineJoin="round"
                    tension={0.5}
                  />
                ))}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* CODE EDITOR */}

        <div
          style={{
            background: "#1e293b",
            padding: "20px",
            borderRadius: "12px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h2>💻 Code Editor</h2>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
              }}
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <Editor
            height="500px"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
            options={{
              fontSize: 15,
              minimap: {
                enabled: false,
              },
              automaticLayout: true,
              wordWrap: "on",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;