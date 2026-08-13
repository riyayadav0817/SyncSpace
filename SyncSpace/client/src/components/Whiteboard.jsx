import { useEffect, useState } from "react";
import { Stage, Layer, Line, Text } from "react-konva";

function Whiteboard({
  joinedRoom,
  lines,
  setLines,
  color,
  setColor,
  brushSize,
  setBrushSize,
  isDrawing,
  setIsDrawing,
  socket,
}) {
  const [tool, setTool] = useState("pen");
  const [texts, setTexts] = useState([]);
  const [textInput, setTextInput] = useState("");

  // Undo / Redo
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // =========================
  // ROOM STATE
  // =========================

  useEffect(() => {
    const handleRoomState = (state) => {
      if (!state) return;

      if (Array.isArray(state.lines)) {
        setLines(state.lines);
      }

      if (Array.isArray(state.texts)) {
        setTexts(state.texts);
      }

      // Code state is handled by CodeEditor.
    };

    socket.on("room-state", handleRoomState);

    return () => {
      socket.off("room-state", handleRoomState);
    };
  }, [socket, setLines]);

  // =========================
  // LIVE SOCKET EVENTS
  // =========================

  useEffect(() => {
    const handleAddText = (data) => {
      if (!data?.text) return;

      setTexts((oldTexts) => {
        const exists = oldTexts.some(
          (item) => item.id === data.text.id
        );

        if (exists) {
          return oldTexts;
        }

        return [...oldTexts, data.text];
      });
    };

    const handleDeleteText = (data) => {
      if (!data?.textId) return;

      setTexts((oldTexts) =>
        oldTexts.filter(
          (item) => item.id !== data.textId
        )
      );
    };

    const handleEraseLine = (data) => {
      if (
        typeof data?.lineIndex !== "number"
      ) {
        return;
      }

      setLines((oldLines) =>
        oldLines.filter(
          (_, index) =>
            index !== data.lineIndex
        )
      );
    };

    const handleDrawLine = (data) => {
      if (!data?.points) return;

      setLines((oldLines) => [
        ...oldLines,
        {
          points: data.points,
          color: data.color,
          brushSize: data.brushSize,
        },
      ]);
    };

    const handleClearBoard = () => {
      setLines([]);
      setTexts([]);
      setUndoStack([]);
      setRedoStack([]);
    };

    socket.on("add-text", handleAddText);
    socket.on("delete-text", handleDeleteText);
    socket.on("erase-line", handleEraseLine);
    socket.on("draw-line", handleDrawLine);
    socket.on("clear-board", handleClearBoard);

    return () => {
      socket.off("add-text", handleAddText);
      socket.off("delete-text", handleDeleteText);
      socket.off("erase-line", handleEraseLine);
      socket.off("draw-line", handleDrawLine);
      socket.off("clear-board", handleClearBoard);
    };
  }, [socket, setLines]);

  // =========================
  // SAVE HISTORY
  // =========================

  const saveHistory = () => {
    setUndoStack((oldStack) => [
      ...oldStack,
      {
        lines: [...lines],
        texts: [...texts],
      },
    ]);

    setRedoStack([]);
  };

  // =========================
  // UNDO
  // =========================

  const undo = () => {
    if (!joinedRoom) {
      return;
    }

    if (undoStack.length === 0) {
      return;
    }

    const previousState =
      undoStack[undoStack.length - 1];

    setRedoStack((oldStack) => [
      ...oldStack,
      {
        lines: [...lines],
        texts: [...texts],
      },
    ]);

    setUndoStack((oldStack) =>
      oldStack.slice(0, -1)
    );

    setLines(previousState.lines);
    setTexts(previousState.texts);
  };

  // =========================
  // REDO
  // =========================

  const redo = () => {
    if (!joinedRoom) {
      return;
    }

    if (redoStack.length === 0) {
      return;
    }

    const nextState =
      redoStack[redoStack.length - 1];

    setUndoStack((oldStack) => [
      ...oldStack,
      {
        lines: [...lines],
        texts: [...texts],
      },
    ]);

    setRedoStack((oldStack) =>
      oldStack.slice(0, -1)
    );

    setLines(nextState.lines);
    setTexts(nextState.texts);
  };

  // =========================
  // START DRAWING
  // =========================

  const startDrawing = (event) => {
    if (!joinedRoom) {
      alert("Please join a room first");
      return;
    }

    const stage = event.target.getStage();

    if (!stage) return;

    const point =
      stage.getPointerPosition();

    if (!point) return;

    // =========================
    // TEXT TOOL
    // =========================

    if (tool === "text") {
      const text = textInput.trim();

      if (!text) {
        alert("Enter some text first");
        return;
      }

      saveHistory();

      const newText = {
        id: `${socket.id}-${Date.now()}`,
        text,
        x: point.x,
        y: point.y,
        color,
        fontSize: Math.max(
          12,
          brushSize * 4
        ),
      };

      setTexts((oldTexts) => [
        ...oldTexts,
        newText,
      ]);

      socket.emit("add-text", {
        roomId: joinedRoom,
        text: newText,
      });

      setTextInput("");

      return;
    }

    // =========================
    // ERASER
    // =========================

    if (tool === "eraser") {
      return;
    }

    // =========================
    // PEN
    // =========================

    saveHistory();

    setIsDrawing(true);

    setLines((oldLines) => [
      ...oldLines,
      {
        points: [
          point.x,
          point.y,
        ],
        color,
        brushSize,
      },
    ]);
  };

  // =========================
  // DRAW
  // =========================

  const draw = (event) => {
    if (
      !isDrawing ||
      tool !== "pen"
    ) {
      return;
    }

    const stage =
      event.target.getStage();

    if (!stage) return;

    const point =
      stage.getPointerPosition();

    if (!point) return;

    setLines((oldLines) => {
      const lastLine =
        oldLines[
          oldLines.length - 1
        ];

      if (!lastLine) {
        return oldLines;
      }

      const updatedLine = {
        ...lastLine,
        points: [
          ...lastLine.points,
          point.x,
          point.y,
        ],
      };

      return [
        ...oldLines.slice(0, -1),
        updatedLine,
      ];
    });
  };

  // =========================
  // STOP DRAWING
  // =========================

  const stopDrawing = () => {
    if (!isDrawing) {
      return;
    }

    setIsDrawing(false);

    setLines((currentLines) => {
      const lastLine =
        currentLines[
          currentLines.length - 1
        ];

      if (!lastLine) {
        return currentLines;
      }

      socket.emit("draw-line", {
        roomId: joinedRoom,
        points: lastLine.points,
        color: lastLine.color,
        brushSize: lastLine.brushSize,
      });

      return currentLines;
    });
  };

  // =========================
  // ERASE LINE
  // =========================

  const eraseLine = (index) => {
    if (tool !== "eraser") {
      return;
    }

    if (!joinedRoom) {
      return;
    }

    saveHistory();

    setLines((oldLines) =>
      oldLines.filter(
        (_, lineIndex) =>
          lineIndex !== index
      )
    );

    socket.emit("erase-line", {
      roomId: joinedRoom,
      lineIndex: index,
    });
  };

  // =========================
  // DELETE TEXT
  // =========================

  const deleteText = (id) => {
    if (!joinedRoom) {
      return;
    }

    saveHistory();

    setTexts((oldTexts) =>
      oldTexts.filter(
        (item) => item.id !== id
      )
    );

    socket.emit("delete-text", {
      roomId: joinedRoom,
      textId: id,
    });
  };

  // =========================
  // CLEAR BOARD
  // =========================

  const clearBoard = () => {
    if (!joinedRoom) {
      alert("Please join a room first");
      return;
    }

    if (
      lines.length === 0 &&
      texts.length === 0
    ) {
      return;
    }

    saveHistory();

    setLines([]);
    setTexts([]);
    setIsDrawing(false);

    socket.emit(
      "clear-board",
      joinedRoom
    );
  };

  // =========================
  // KEYBOARD
  // =========================

  const handleTextKeyDown = (event) => {
    if (event.key === "Escape") {
      setTextInput("");
      setTool("pen");
    }
  };

  // =========================
  // UI
  // =========================

  return (
    <div
      style={{
        background: "#1e293b",
        padding: "20px",
        borderRadius: "12px",
        marginTop: "20px",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
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
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {/* PEN */}

          <button
            type="button"
            onClick={() =>
              setTool("pen")
            }
            style={{
              padding: "8px 14px",
              background:
                tool === "pen"
                  ? "#2563eb"
                  : "#475569",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ✏️ Pen
          </button>

          {/* ERASER */}

          <button
            type="button"
            onClick={() =>
              setTool("eraser")
            }
            style={{
              padding: "8px 14px",
              background:
                tool === "eraser"
                  ? "#f59e0b"
                  : "#475569",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            🧹 Eraser
          </button>

          {/* TEXT */}

          <button
            type="button"
            onClick={() =>
              setTool("text")
            }
            style={{
              padding: "8px 14px",
              background:
                tool === "text"
                  ? "#16a34a"
                  : "#475569",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            📝 Text
          </button>

          {/* UNDO */}

          <button
            type="button"
            onClick={undo}
            disabled={
              undoStack.length === 0
            }
            style={{
              padding: "8px 14px",
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor:
                undoStack.length === 0
                  ? "not-allowed"
                  : "pointer",
              opacity:
                undoStack.length === 0
                  ? 0.5
                  : 1,
            }}
          >
            ↩️ Undo
          </button>

          {/* REDO */}

          <button
            type="button"
            onClick={redo}
            disabled={
              redoStack.length === 0
            }
            style={{
              padding: "8px 14px",
              background: "#8b5cf6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor:
                redoStack.length === 0
                  ? "not-allowed"
                  : "pointer",
              opacity:
                redoStack.length === 0
                  ? 0.5
                  : 1,
            }}
          >
            ↪️ Redo
          </button>

          {/* COLOR */}

          <label>
            Color{" "}
            <input
              type="color"
              value={color}
              onChange={(event) =>
                setColor(
                  event.target.value
                )
              }
            />
          </label>

          {/* SIZE */}

          <label>
            Size{" "}
            <select
              value={brushSize}
              onChange={(event) =>
                setBrushSize(
                  Number(
                    event.target.value
                  )
                )
              }
            >
              <option value={2}>
                Small
              </option>
              <option value={4}>
                Medium
              </option>
              <option value={8}>
                Large
              </option>
              <option value={14}>
                Extra Large
              </option>
            </select>
          </label>

          {/* CLEAR */}

          <button
            type="button"
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
            🗑 Clear
          </button>
        </div>
      </div>

      {/* TEXT INPUT */}

      {tool === "text" && (
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            value={textInput}
            onChange={(event) =>
              setTextInput(
                event.target.value
              )
            }
            onKeyDown={
              handleTextKeyDown
            }
            placeholder="Type text, then click the board"
            style={{
              flex: 1,
              minWidth: "250px",
              padding: "10px",
              borderRadius: "6px",
              border: "none",
              outline: "none",
            }}
          />

          <span
            style={{
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
            }}
          >
            Type text → click board
          </span>
        </div>
      )}

      {/* CANVAS */}

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
          onMouseDown={
            startDrawing
          }
          onMouseMove={draw}
          onMouseUp={
            stopDrawing
          }
          onMouseLeave={
            stopDrawing
          }
          onTouchStart={
            startDrawing
          }
          onTouchMove={draw}
          onTouchEnd={
            stopDrawing
          }
          style={{
            cursor:
              tool === "text"
                ? "text"
                : tool === "eraser"
                ? "cell"
                : "crosshair",
          }}
        >
          <Layer>
            {/* LINES */}

            {lines.map(
              (line, index) => (
                <Line
                  key={`line-${index}`}
                  points={
                    line.points
                  }
                  stroke={
                    line.color
                  }
                  strokeWidth={
                    line.brushSize
                  }
                  lineCap="round"
                  lineJoin="round"
                  tension={0.5}
                  onClick={() =>
                    eraseLine(
                      index
                    )
                  }
                  onTap={() =>
                    eraseLine(
                      index
                    )
                  }
                />
              )
            )}

            {/* TEXT */}

            {texts.map(
              (item) => (
                <Text
                  key={item.id}
                  text={item.text}
                  x={item.x}
                  y={item.y}
                  fill={item.color}
                  fontSize={
                    item.fontSize
                  }
                  fontStyle="bold"
                  onClick={() => {
                    if (
                      tool ===
                      "eraser"
                    ) {
                      deleteText(
                        item.id
                      );
                    }
                  }}
                  onTap={() => {
                    if (
                      tool ===
                      "eraser"
                    ) {
                      deleteText(
                        item.id
                      );
                    }
                  }}
                />
              )
            )}
          </Layer>
        </Stage>
      </div>

      {/* MESSAGE */}

      {!joinedRoom && (
        <p
          style={{
            textAlign: "center",
            color: "#94a3b8",
            marginTop: "15px",
          }}
        >
          Join a room first,
          then start drawing.
        </p>
      )}

      {/* TOOL INFO */}

      {joinedRoom && (
        <p
          style={{
            textAlign: "center",
            color: "#94a3b8",
            marginTop: "12px",
            marginBottom: 0,
          }}
        >
          Current tool:{" "}
          <strong>
            {tool === "pen"
              ? "✏️ Pen"
              : tool === "eraser"
              ? "🧹 Eraser"
              : "📝 Text"}
          </strong>
        </p>
      )}
    </div>
  );
}

export default Whiteboard;