import { useCallback, useEffect, useRef, useState } from "react";

function Whiteboard({
  joinedRoom,
  lines,
  setLines,
  color,
  setColor,
  brushSize,
  setBrushSize,
  socket,
  history,
  setHistory,
  redoStack,
  setRedoStack,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const drawingRef = useRef(false);
  const currentLineRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [isClearing, setIsClearing] = useState(false);

  // ============================================
  // CONSTANTS
  // ============================================

  const CANVAS_HEIGHT = 600;

  const defaultBackground = "#ffffff";

  // ============================================
  // DRAW SINGLE LINE
  // ============================================

  const drawLine = useCallback((ctx, line) => {
    if (!line?.points || line.points.length === 0) {
      return;
    }

    const points = line.points;

    ctx.save();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (line.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = line.color || "#2563eb";
    }

    ctx.lineWidth = line.brushSize || 4;

    ctx.beginPath();

    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 1) {
      ctx.lineTo(
        points[0].x + 0.01,
        points[0].y + 0.01
      );
    } else {
      for (let index = 1; index < points.length; index++) {
        ctx.lineTo(
          points[index].x,
          points[index].y
        );
      }
    }

    ctx.stroke();

    ctx.restore();
  }, []);

  // ============================================
  // REDRAW CANVAS
  // ============================================

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = defaultBackground;
    ctx.fillRect(0, 0, width, height);

    lines.forEach((line) => {
      drawLine(ctx, line);
    });
  }, [lines, drawLine]);

  // ============================================
  // RESIZE CANVAS
  // ============================================

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();

    const width = Math.max(
      Math.floor(rect.width),
      300
    );

    const height = CANVAS_HEIGHT;

    const dpr =
      window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    ctx.fillStyle = defaultBackground;
    ctx.fillRect(
      0,
      0,
      width,
      height
    );

    lines.forEach((line) => {
      drawLine(ctx, line);
    });
  }, [lines, drawLine]);

  // ============================================
  // INITIAL RESIZE
  // ============================================

  useEffect(() => {
    resizeCanvas();

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, [resizeCanvas]);

  // ============================================
  // REDRAW WHEN LINES CHANGE
  // ============================================

  useEffect(() => {
    redrawCanvas();
  }, [lines, redrawCanvas]);

  // ============================================
  // GET POINTER POSITION
  // ============================================

  const getPoint = (event) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect =
      canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  // ============================================
  // START DRAWING
  // ============================================

  const startDrawing = (event) => {
    if (!joinedRoom) return;

    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) return;

    canvas.setPointerCapture?.(
      event.pointerId
    );

    const point = getPoint(event);

    drawingRef.current = true;

    const newLine = {
      points: [point],

      color:
        tool === "eraser"
          ? "#ffffff"
          : color,

      brushSize:
        tool === "eraser"
          ? Math.max(brushSize * 3, 12)
          : brushSize,

      tool,
    };

    currentLineRef.current = newLine;

    setHistory((previous) => [
      ...previous,
      lines,
    ]);

    setRedoStack([]);

    setLines((previous) => [
      ...previous,
      newLine,
    ]);
  };

  // ============================================
  // DRAW
  // ============================================

  const draw = (event) => {
    if (!drawingRef.current) return;

    const point = getPoint(event);

    const currentLine =
      currentLineRef.current;

    if (!currentLine) return;

    currentLine.points.push(point);

    setLines((previous) => {
      if (previous.length === 0) {
        return previous;
      }

      const updated = [...previous];

      updated[updated.length - 1] = {
        ...currentLine,
        points: [
          ...currentLine.points,
        ],
      };

      return updated;
    });
  };

  // ============================================
  // STOP DRAWING
  // ============================================

  const stopDrawing = (event) => {
    if (!drawingRef.current) {
      return;
    }

    drawingRef.current = false;

    const canvas = canvasRef.current;

    if (canvas) {
      canvas.releasePointerCapture?.(
        event.pointerId
      );
    }

    const completedLine =
      currentLineRef.current;

    currentLineRef.current = null;

    if (
      !completedLine ||
      !joinedRoom ||
      !socket
    ) {
      return;
    }

    if (
      !Array.isArray(
        completedLine.points
      ) ||
      completedLine.points.length === 0
    ) {
      return;
    }

    socket.emit("draw-line", {
      roomId: joinedRoom,

      points: completedLine.points,

      color: completedLine.color,

      brushSize:
        completedLine.brushSize,

      tool: completedLine.tool,
    });
  };

  // ============================================
  // UNDO
  // ============================================

  const undo = () => {
    if (lines.length === 0) {
      return;
    }

    const previousLines = [
      ...lines,
    ];

    const removedLine =
      previousLines.pop();

    setHistory((previous) => [
      ...previous,
      lines,
    ]);

    setRedoStack((previous) => [
      ...previous,
      removedLine,
    ]);

    setLines(previousLines);
  };

  // ============================================
  // REDO
  // ============================================

  const redo = () => {
    if (redoStack.length === 0) {
      return;
    }

    const restoredLine =
      redoStack[
        redoStack.length - 1
      ];

    setHistory((previous) => [
      ...previous,
      lines,
    ]);

    setRedoStack((previous) =>
      previous.slice(0, -1)
    );

    setLines((previous) => [
      ...previous,
      restoredLine,
    ]);
  };

  // ============================================
  // CLEAR BOARD
  // ============================================

  const clearBoard = () => {
    if (
      lines.length === 0 ||
      isClearing
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to clear the entire whiteboard?"
      );

    if (!confirmed) {
      return;
    }

    setIsClearing(true);

    setHistory((previous) => [
      ...previous,
      lines,
    ]);

    setRedoStack([]);

    setLines([]);

    if (
      socket &&
      socket.connected &&
      joinedRoom
    ) {
      socket.emit(
        "clear-board",
        {
          roomId: joinedRoom,
        }
      );
    }

    window.setTimeout(() => {
      setIsClearing(false);
    }, 250);
  };

  // ============================================
  // TOOL BUTTON
  // ============================================

  const ToolButton = ({
    active,
    icon,
    label,
    onClick,
  }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          padding:
            "8px 12px",

          borderRadius: "9px",

          border: active
            ? "1px solid #60a5fa"
            : "1px solid #334155",

          background: active
            ? "#1d4ed8"
            : "#1e293b",

          color: "#f8fafc",

          cursor: "pointer",

          fontSize: "13px",

          fontWeight: 600,

          boxShadow: active
            ? "0 0 0 2px rgba(37,99,235,0.18)"
            : "none",

          transition:
            "all 0.15s ease",
        }}
      >
        <span
          style={{
            fontSize: "16px",
          }}
        >
          {icon}
        </span>

        {label}
      </button>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      style={{
        width: "100%",

        marginTop: "18px",

        background:
          "linear-gradient(180deg,#0f172a,#020617)",

        border:
          "1px solid #1e293b",

        borderRadius: "18px",

        overflow: "hidden",

        boxShadow:
          "0 24px 60px rgba(0,0,0,0.28)",
      }}
    >
      {/* ======================================
          HEADER
      ====================================== */}

      <div
        style={{
          padding:
            "18px 20px",

          display: "flex",

          justifyContent:
            "space-between",

          alignItems: "center",

          gap: "15px",

          flexWrap: "wrap",

          background:
            "linear-gradient(135deg,#111827,#172033)",

          borderBottom:
            "1px solid #1e293b",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(135deg,#2563eb,#7c3aed)",
                fontSize: "20px",
              }}
            >
              🎨
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#f8fafc",
                  fontSize: "19px",
                  fontWeight: 700,
                }}
              >
                SyncSpace Canvas
              </h2>

              <p
                style={{
                  margin:
                    "3px 0 0",
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                Collaborative
                Whiteboard
              </p>
            </div>
          </div>
        </div>

        {/* ROOM STATUS */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",

            padding:
              "8px 12px",

            border:
              "1px solid #1e293b",

            background:
              "#0b1220",

            borderRadius: "999px",

            color: "#cbd5e1",

            fontSize: "12px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background:
                joinedRoom
                  ? "#22c55e"
                  : "#ef4444",
              boxShadow:
                joinedRoom
                  ? "0 0 10px rgba(34,197,94,.65)"
                  : "none",
            }}
          />

          {joinedRoom
            ? `Room ${joinedRoom}`
            : "Not connected"}
        </div>
      </div>

      {/* ======================================
          TOOLBAR
      ====================================== */}

      <div
        style={{
          padding:
            "12px 16px",

          display: "flex",

          alignItems: "center",

          gap: "8px",

          flexWrap: "wrap",

          background:
            "#0b1220",

          borderBottom:
            "1px solid #1e293b",
        }}
      >
        <ToolButton
          active={tool === "pen"}
          icon="✏️"
          label="Pen"
          onClick={() =>
            setTool("pen")
          }
        />

        <ToolButton
          active={tool === "eraser"}
          icon="🧹"
          label="Eraser"
          onClick={() =>
            setTool("eraser")
          }
        />

        {/* DIVIDER */}

        <div
          style={{
            width: "1px",
            height: "28px",
            background:
              "#334155",
            margin:
              "0 4px",
          }}
        />

        {/* COLOR */}

        <label
          title="Choose brush color"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",

            padding:
              "5px 9px",

            border:
              "1px solid #334155",

            borderRadius: "9px",

            background:
              "#1e293b",

            color: "#cbd5e1",

            fontSize: "12px",

            cursor: "pointer",
          }}
        >
          <span>🎨</span>

          <input
            type="color"
            value={color}
            onChange={(event) =>
              setColor(
                event.target.value
              )
            }
            disabled={
              tool === "eraser"
            }
            style={{
              width: "30px",
              height: "26px",
              padding: 0,
              border: "none",
              background:
                "transparent",
              cursor: "pointer",
              opacity:
                tool === "eraser"
                  ? 0.45
                  : 1,
            }}
          />
        </label>

        {/* BRUSH */}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",

            padding:
              "7px 10px",

            border:
              "1px solid #334155",

            borderRadius: "9px",

            background:
              "#1e293b",

            color: "#cbd5e1",

            fontSize: "12px",
          }}
        >
          <span>📏</span>

          <input
            type="range"
            min="1"
            max="24"
            value={brushSize}
            onChange={(event) =>
              setBrushSize(
                Number(
                  event.target.value
                )
              )
            }
            style={{
              width: "90px",
              cursor: "pointer",
            }}
          />

          <strong
            style={{
              minWidth: "25px",
              textAlign: "right",
              color: "#f8fafc",
            }}
          >
            {brushSize}px
          </strong>
        </label>

        <div
          style={{
            flex: 1,
            minWidth: "10px",
          }}
        />

        {/* UNDO */}

        <button
          type="button"
          onClick={undo}
          disabled={
            lines.length === 0
          }
          title="Undo"
          style={{
            padding:
              "8px 11px",

            border:
              "1px solid #334155",

            borderRadius: "8px",

            background:
              "#1e293b",

            color: "#e2e8f0",

            cursor:
              lines.length === 0
                ? "not-allowed"
                : "pointer",

            opacity:
              lines.length === 0
                ? 0.45
                : 1,
          }}
        >
          ↩
        </button>

        {/* REDO */}

        <button
          type="button"
          onClick={redo}
          disabled={
            redoStack.length === 0
          }
          title="Redo"
          style={{
            padding:
              "8px 11px",

            border:
              "1px solid #334155",

            borderRadius: "8px",

            background:
              "#1e293b",

            color: "#e2e8f0",

            cursor:
              redoStack.length === 0
                ? "not-allowed"
                : "pointer",

            opacity:
              redoStack.length === 0
                ? 0.45
                : 1,
          }}
        >
          ↪
        </button>

        {/* CLEAR */}

        <button
          type="button"
          onClick={clearBoard}
          disabled={
            lines.length === 0 ||
            isClearing
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",

            padding:
              "8px 12px",

            border: "none",

            borderRadius: "8px",

            background:
              "#dc2626",

            color: "white",

            cursor:
              lines.length === 0 ||
              isClearing
                ? "not-allowed"
                : "pointer",

            opacity:
              lines.length === 0 ||
              isClearing
                ? 0.45
                : 1,

            fontWeight: 600,
          }}
        >
          🗑
          {isClearing
            ? "Clearing..."
            : "Clear"}
        </button>
      </div>

      {/* ======================================
          CANVAS AREA
      ====================================== */}

      <div
        style={{
          padding: "16px",

          background:
            "#020617",
        }}
      >
        <div
          ref={containerRef}
          style={{
            position: "relative",

            width: "100%",

            height:
              `${CANVAS_HEIGHT}px`,

            borderRadius: "12px",

            overflow: "hidden",

            background:
              "#ffffff",

            boxShadow:
              "0 12px 40px rgba(0,0,0,0.3)",

            border:
              "1px solid #cbd5e1",
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={
              startDrawing
            }
            onPointerMove={draw}
            onPointerUp={
              stopDrawing
            }
            onPointerCancel={
              stopDrawing
            }
            onPointerLeave={
              stopDrawing
            }
            style={{
              display: "block",

              width: "100%",

              height:
                `${CANVAS_HEIGHT}px`,

              cursor:
                tool === "eraser"
                  ? "cell"
                  : "crosshair",

              touchAction:
                "none",

              userSelect:
                "none",
            }}
          />

          {/* EMPTY STATE */}

          {lines.length === 0 && (
            <div
              style={{
                position:
                  "absolute",

                inset: 0,

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                pointerEvents:
                  "none",
              }}
            >
              <div
                style={{
                  textAlign:
                    "center",

                  color:
                    "#94a3b8",
                }}
              >
                <div
                  style={{
                    fontSize: "46px",
                    marginBottom:
                      "10px",
                  }}
                >
                  🖌️
                </div>

                <div
                  style={{
                    color:
                      "#334155",

                    fontSize:
                      "18px",

                    fontWeight: 700,
                  }}
                >
                  Your canvas is ready
                </div>

                <div
                  style={{
                    marginTop:
                      "6px",

                    color:
                      "#64748b",

                    fontSize:
                      "13px",
                  }}
                >
                  Pick a tool and
                  start drawing
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================
          FOOTER
      ====================================== */}

      <div
        style={{
          padding:
            "10px 16px",

          display: "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap: "12px",

          flexWrap: "wrap",

          background:
            "#0b1220",

          borderTop:
            "1px solid #1e293b",

          color:
            "#64748b",

          fontSize: "11px",
        }}
      >
        <span>
          Tool:{" "}
          <strong
            style={{
              color:
                "#cbd5e1",
            }}
          >
            {tool === "pen"
              ? "Pen"
              : "Eraser"}
          </strong>
        </span>

        <span>
          Strokes:{" "}
          <strong
            style={{
              color:
                "#cbd5e1",
            }}
          >
            {lines.length}
          </strong>
        </span>

        <span>
          Brush:{" "}
          <strong
            style={{
              color:
                "#cbd5e1",
            }}
          >
            {brushSize}px
          </strong>
        </span>

        <span>
          {joinedRoom
            ? "🟢 Live collaboration enabled"
            : "🔴 Join a workspace first"}
        </span>
      </div>
    </div>
  );
}

export default Whiteboard;