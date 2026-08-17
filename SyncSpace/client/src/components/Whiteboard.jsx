import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createRoomProvider,
} from "../collaboration/yjsProvider";

function Whiteboard({
  joinedRoom,
  lines,
  setLines,
  color,
  setColor,
  brushSize,
  setBrushSize,
  socket,
  setHistory,
  redoStack,
  setRedoStack,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const providerRef = useRef(null);
  const yBoardRef = useRef(null);
  const yRedoRef = useRef(null);

  const drawingRef = useRef(false);
  const currentLineRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [yjsConnected, setYjsConnected] = useState(false);

  const CANVAS_HEIGHT = 600;

  // =====================================================
  // READ YJS LINES
  // =====================================================

  const readLinesFromYjs = useCallback((yArray) => {
    if (!yArray) {
      return [];
    }

    return yArray
      .toArray()
      .map((value) => {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }, []);

  // =====================================================
  // READ REDO
  // =====================================================

  const readRedoFromYjs = useCallback((yArray) => {
    if (!yArray) {
      return [];
    }

    return yArray
      .toArray()
      .map((value) => {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }, []);

  // =====================================================
  // DRAW SINGLE LINE
  // =====================================================

  const drawLine = useCallback((ctx, line) => {
    if (
      !line ||
      !Array.isArray(line.points) ||
      line.points.length === 0
    ) {
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

    ctx.lineWidth = Number(line.brushSize) || 4;

    ctx.beginPath();

    const first = points[0];

    ctx.moveTo(
      Number(first.x) || 0,
      Number(first.y) || 0,
    );

    // Single point -> make a dot
    if (points.length === 1) {
      ctx.arc(
        Number(first.x) || 0,
        Number(first.y) || 0,
        Math.max((Number(line.brushSize) || 4) / 2, 1),
        0,
        Math.PI * 2,
      );

      ctx.fillStyle =
        line.tool === "eraser"
          ? "rgba(0,0,0,1)"
          : line.color || "#2563eb";

      if (line.tool === "eraser") {
        ctx.fill();
      } else {
        ctx.fillStyle = line.color || "#2563eb";
        ctx.fill();
      }
    } else {
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(
          Number(points[i].x) || 0,
          Number(points[i].y) || 0,
        );
      }

      ctx.stroke();
    }

    ctx.restore();
  }, []);

  // =====================================================
  // CLEAR CANVAS
  // =====================================================

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    const width = canvas.clientWidth;

    ctx.clearRect(
      0,
      0,
      width,
      CANVAS_HEIGHT,
    );

    ctx.save();

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      0,
      width,
      CANVAS_HEIGHT,
    );

    ctx.restore();
  }, []);

  // =====================================================
  // REDRAW
  // =====================================================

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    clearCanvas();

    lines.forEach((line) => {
      drawLine(ctx, line);
    });
  }, [
    lines,
    drawLine,
    clearCanvas,
  ]);

  // =====================================================
  // RESIZE CANVAS
  // =====================================================

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      return;
    }

    const rect =
      container.getBoundingClientRect();

    const width = Math.max(
      Math.floor(rect.width),
      300,
    );

    const dpr =
      window.devicePixelRatio || 1;

    canvas.width =
      Math.floor(width * dpr);

    canvas.height =
      Math.floor(CANVAS_HEIGHT * dpr);

    canvas.style.width =
      `${width}px`;

    canvas.style.height =
      `${CANVAS_HEIGHT}px`;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0,
    );

    ctx.clearRect(
      0,
      0,
      width,
      CANVAS_HEIGHT,
    );

    ctx.save();

    ctx.globalCompositeOperation =
      "source-over";

    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      0,
      width,
      CANVAS_HEIGHT,
    );

    ctx.restore();

    lines.forEach((line) => {
      drawLine(ctx, line);
    });
  }, [
    lines,
    drawLine,
  ]);

  // =====================================================
  // RESIZE LISTENER
  // =====================================================

  useEffect(() => {
    resizeCanvas();

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, [resizeCanvas]);

  // =====================================================
  // REDRAW WHEN LINES CHANGE
  // =====================================================

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // =====================================================
  // CONNECT YJS
  // =====================================================

  useEffect(() => {
    if (!joinedRoom) {
      providerRef.current = null;
      yBoardRef.current = null;
      yRedoRef.current = null;

      setYjsConnected(false);
      setLines([]);
      setRedoStack([]);

      return;
    }

    let room = null;

    try {
      console.log(
        "Connecting whiteboard to room:",
        joinedRoom,
      );

      room = createRoomProvider(
        joinedRoom,
        {
          name: "Whiteboard User",
        },
      );

      const {
        provider,
        whiteboard,
        whiteboardRedo,
      } = room;

      providerRef.current = provider;
      yBoardRef.current = whiteboard;
      yRedoRef.current = whiteboardRedo;

      // ===================================================
      // STATUS
      // ===================================================

      const handleStatus = ({
        status,
      }) => {
        console.log(
          "Whiteboard Yjs status:",
          status,
        );

        setYjsConnected(
          status === "connected",
        );
      };

      provider.on(
        "status",
        handleStatus,
      );

      // ===================================================
      // SYNC
      // ===================================================

      const handleSync = (
        isSynced,
      ) => {
        console.log(
          "Whiteboard Yjs sync:",
          isSynced,
        );

        if (isSynced) {
          const syncedLines =
            readLinesFromYjs(
              whiteboard,
            );

          const syncedRedo =
            readRedoFromYjs(
              whiteboardRedo,
            );

          setLines(syncedLines);
          setRedoStack(syncedRedo);

          setYjsConnected(true);
        }
      };

      provider.on(
        "sync",
        handleSync,
      );

      // ===================================================
      // INITIAL DATA
      // ===================================================

      const initialLines =
        readLinesFromYjs(
          whiteboard,
        );

      const initialRedo =
        readRedoFromYjs(
          whiteboardRedo,
        );

      setLines(initialLines);
      setRedoStack(initialRedo);

      // ===================================================
      // BOARD CHANGE
      // ===================================================

      const handleBoardChange = () => {
        const nextLines =
          readLinesFromYjs(
            whiteboard,
          );

        console.log(
          "Whiteboard changed:",
          nextLines.length,
        );

        setLines(nextLines);
      };

      whiteboard.observe(
        handleBoardChange,
      );

      // ===================================================
      // REDO CHANGE
      // ===================================================

      const handleRedoChange = () => {
        const nextRedo =
          readRedoFromYjs(
            whiteboardRedo,
          );

        setRedoStack(nextRedo);
      };

      whiteboardRedo.observe(
        handleRedoChange,
      );

      // ===================================================
      // CLEANUP
      // ===================================================

      return () => {
        console.log(
          "Disconnecting whiteboard",
        );

        provider.off(
          "status",
          handleStatus,
        );

        provider.off(
          "sync",
          handleSync,
        );

        whiteboard.unobserve(
          handleBoardChange,
        );

        whiteboardRedo.unobserve(
          handleRedoChange,
        );

        provider.destroy();

        room.doc.destroy();

        providerRef.current = null;
        yBoardRef.current = null;
        yRedoRef.current = null;

        setYjsConnected(false);
      };
    } catch (error) {
      console.error(
        "Whiteboard Yjs connection failed:",
        error,
      );

      setYjsConnected(false);
    }
  }, [
    joinedRoom,
    setLines,
    setRedoStack,
    readLinesFromYjs,
    readRedoFromYjs,
  ]);

  // =====================================================
  // GET POINTER POINT
  // =====================================================

  const getPoint = useCallback(
    (event) => {
      const canvas =
        canvasRef.current;

      if (!canvas) {
        return {
          x: 0,
          y: 0,
        };
      }

      const rect =
        canvas.getBoundingClientRect();

      return {
        x:
          event.clientX -
          rect.left,

        y:
          event.clientY -
          rect.top,
      };
    },
    [],
  );

  // =====================================================
  // START DRAWING
  // =====================================================

  const startDrawing = useCallback(
    (event) => {
      if (!joinedRoom) {
        return;
      }

      const yBoard =
        yBoardRef.current;

      if (!yBoard) {
        console.warn(
          "Whiteboard not connected to Yjs",
        );

        return;
      }

      if (
        event.pointerType ===
          "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      const canvas =
        canvasRef.current;

      if (!canvas) {
        return;
      }

      event.preventDefault();

      canvas.setPointerCapture?.(
        event.pointerId,
      );

      const point =
        getPoint(event);

      const safeBrushSize =
        Number(brushSize) || 4;

      const newLine = {
        id:
          crypto.randomUUID?.() ||
          `${Date.now()}-${Math.random()}`,

        type: tool,

        tool,

        points: [point],

        color:
          tool === "eraser"
            ? "#ffffff"
            : color,

        brushSize:
          tool === "eraser"
            ? Math.max(
                safeBrushSize * 3,
                12,
              )
            : safeBrushSize,
      };

      drawingRef.current = true;

      currentLineRef.current =
        newLine;

      // Immediate local preview
      setLines((previous) => [
        ...previous,
        newLine,
      ]);

      // Draw first point immediately
      const ctx =
        canvas.getContext("2d");

      if (ctx) {
        drawLine(
          ctx,
          newLine,
        );
      }
    },
    [
      joinedRoom,
      brushSize,
      tool,
      color,
      getPoint,
      setLines,
      drawLine,
    ],
  );

  // =====================================================
  // DRAW
  // =====================================================

  const draw = useCallback(
    (event) => {
      if (!drawingRef.current) {
        return;
      }

      const current =
        currentLineRef.current;

      if (!current) {
        return;
      }

      event.preventDefault();

      const point =
        getPoint(event);

      current.points.push(point);

      // Update local preview
      setLines((previous) => {
        if (
          previous.length === 0
        ) {
          return previous;
        }

        const copy = [
          ...previous,
        ];

        copy[
          copy.length - 1
        ] = {
          ...current,
          points: [
            ...current.points,
          ],
        };

        return copy;
      });
    },
    [
      getPoint,
      setLines,
    ],
  );

  // =====================================================
  // STOP DRAWING
  // =====================================================

  const stopDrawing = useCallback(
    (event) => {
      if (!drawingRef.current) {
        return;
      }

      drawingRef.current = false;

      event?.preventDefault();

      const canvas =
        canvasRef.current;

      canvas?.releasePointerCapture?.(
        event?.pointerId,
      );

      const line =
        currentLineRef.current;

      currentLineRef.current =
        null;

      if (
        !line ||
        !line.points ||
        line.points.length === 0
      ) {
        return;
      }

      const yBoard =
        yBoardRef.current;

      const provider =
        providerRef.current;

      if (!yBoard || !provider) {
        return;
      }

      console.log(
        "Saving stroke to Yjs:",
        line.id,
      );

      // =================================================
      // SAVE TO YJS
      // =================================================

      provider.doc.transact(() => {
        yBoard.push([
          JSON.stringify(line),
        ]);

        // New drawing clears redo
        const yRedo =
          yRedoRef.current;

        if (
          yRedo &&
          yRedo.length > 0
        ) {
          yRedo.delete(
            0,
            yRedo.length,
          );
        }
      });
    },
    [],
  );

  // =====================================================
  // POINTER LEAVE / CANCEL
  // =====================================================

  const cancelDrawing = useCallback(
    (event) => {
      if (!drawingRef.current) {
        return;
      }

      stopDrawing(event);
    },
    [stopDrawing],
  );

  // =====================================================
  // UNDO
  // =====================================================

  const undo = useCallback(() => {
    const provider =
      providerRef.current;

    const yBoard =
      yBoardRef.current;

    const yRedo =
      yRedoRef.current;

    if (
      !provider ||
      !yBoard ||
      !yRedo ||
      yBoard.length === 0
    ) {
      return;
    }

    const last =
      yBoard.get(
        yBoard.length - 1,
      );

    provider.doc.transact(() => {
      yBoard.delete(
        yBoard.length - 1,
        1,
      );

      yRedo.push([
        last,
      ]);
    });
  }, []);

  // =====================================================
  // REDO
  // =====================================================

  const redo = useCallback(() => {
    const provider =
      providerRef.current;

    const yBoard =
      yBoardRef.current;

    const yRedo =
      yRedoRef.current;

    if (
      !provider ||
      !yBoard ||
      !yRedo ||
      yRedo.length === 0
    ) {
      return;
    }

    const last =
      yRedo.get(
        yRedo.length - 1,
      );

    provider.doc.transact(() => {
      yRedo.delete(
        yRedo.length - 1,
        1,
      );

      yBoard.push([
        last,
      ]);
    });
  }, []);

  // =====================================================
  // CLEAR
  // =====================================================

  const clearBoard = useCallback(() => {
    const provider =
      providerRef.current;

    const yBoard =
      yBoardRef.current;

    const yRedo =
      yRedoRef.current;

    if (
      !provider ||
      !yBoard ||
      !yRedo ||
      yBoard.length === 0
    ) {
      return;
    }

    if (
      !window.confirm(
        "Clear entire whiteboard?",
      )
    ) {
      return;
    }

    provider.doc.transact(() => {
      yBoard.delete(
        0,
        yBoard.length,
      );

      yRedo.delete(
        0,
        yRedo.length,
      );
    });

    setLines([]);
    setRedoStack([]);
    setHistory?.([]);
  }, [
    setLines,
    setRedoStack,
    setHistory,
  ]);

  // =====================================================
  // TOOL BUTTON
  // =====================================================

  const ToolButton = ({
    active,
    icon,
    label,
    onClick,
  }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 12px",
        border: active
          ? "1px solid #60a5fa"
          : "1px solid #334155",
        borderRadius: "9px",
        background: active
          ? "#1d4ed8"
          : "#1e293b",
        color: "#f8fafc",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {icon} {label}
    </button>
  );

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      style={{
        width: "100%",
        marginTop: "18px",
        background: "#020617",
        border: "1px solid #1e293b",
        borderRadius: "18px",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          padding: "18px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#111827",
          color: "#f8fafc",
          gap: "12px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
            }}
          >
            🎨 SyncSpace Canvas
          </h2>

          <small
            style={{
              color: "#94a3b8",
            }}
          >
            Collaborative Whiteboard
          </small>
        </div>

        <div
          style={{
            color: yjsConnected
              ? "#4ade80"
              : "#f87171",
            fontWeight: 600,
          }}
        >
          {yjsConnected
            ? "🟢 Yjs Connected"
            : "🔴 Yjs Disconnected"}
        </div>
      </div>

      {/* TOOLBAR */}

      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
          background: "#0b1220",
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
          active={
            tool === "eraser"
          }
          icon="🧹"
          label="Eraser"
          onClick={() =>
            setTool("eraser")
          }
        />

        <input
          type="color"
          value={color}
          disabled={
            tool === "eraser"
          }
          onChange={(e) =>
            setColor(
              e.target.value,
            )
          }
          style={{
            width: "42px",
            height: "34px",
            cursor: "pointer",
          }}
        />

        <input
          type="range"
          min="1"
          max="24"
          value={brushSize}
          onChange={(e) =>
            setBrushSize(
              Number(
                e.target.value,
              ),
            )
          }
        />

        <span
          style={{
            color: "#cbd5e1",
            minWidth: "45px",
          }}
        >
          {brushSize}px
        </span>

        <div
          style={{
            flex: 1,
          }}
        />

        <button
          type="button"
          onClick={undo}
          disabled={
            !yjsConnected ||
            lines.length === 0
          }
        >
          ↩ Undo
        </button>

        <button
          type="button"
          onClick={redo}
          disabled={
            !yjsConnected ||
            redoStack.length === 0
          }
        >
          ↪ Redo
        </button>

        <button
          type="button"
          onClick={clearBoard}
          disabled={
            !yjsConnected ||
            lines.length === 0
          }
        >
          🗑 Clear
        </button>
      </div>

      {/* CANVAS */}

      <div
        style={{
          padding: "16px",
          background: "#020617",
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: `${CANVAS_HEIGHT}px`,
            background: "#ffffff",
            borderRadius: "12px",
            overflow: "hidden",
            position: "relative",
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
              cancelDrawing
            }
            onPointerLeave={() => {
              // Don't stop drawing here.
              // Pointer capture handles it.
            }}
            style={{
              display: "block",
              width: "100%",
              height: `${CANVAS_HEIGHT}px`,
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              cursor:
                tool === "eraser"
                  ? "cell"
                  : "crosshair",
            }}
          />
        </div>
      </div>

      {/* FOOTER */}

      <div
        style={{
          padding: "10px 16px",
          color: "#94a3b8",
          fontSize: "12px",
        }}
      >
        {joinedRoom
          ? `🟢 Yjs live sync • ${lines.length} strokes`
          : "🔴 Join a workspace first"}
      </div>
    </div>
  );
}

export default Whiteboard;