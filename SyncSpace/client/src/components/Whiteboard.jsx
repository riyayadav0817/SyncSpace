
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
  const currentObjectRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [yjsConnected, setYjsConnected] = useState(false);

  const CANVAS_HEIGHT = 600;

  /* =====================================================
     YJS READ HELPERS
  ===================================================== */

  const readArray = useCallback((yArray) => {
    if (!yArray) return [];

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

  /* =====================================================
     DRAW OBJECT
  ===================================================== */

  const drawObject = useCallback((ctx, object) => {
    if (!object || !Array.isArray(object.points)) {
      return;
    }

    const points = object.points;

    if (points.length < 2) {
      return;
    }

    const type = object.type || "pen";

    const stroke =
      object.color || "#2563eb";

    const width =
      Number(object.brushSize) || 4;

    ctx.save();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    /* =================================================
       ERASER
    ================================================= */

    if (type === "eraser") {
      ctx.globalCompositeOperation =
        "destination-out";
    } else {
      ctx.globalCompositeOperation =
        "source-over";
    }

    ctx.strokeStyle = stroke;
    ctx.fillStyle = stroke;
    ctx.lineWidth =
      type === "eraser"
        ? Math.max(width, 12)
        : width;

    /* =================================================
       PEN / ERASER
    ================================================= */

    if (
      type === "pen" ||
      type === "eraser"
    ) {
      ctx.beginPath();

      const first = points[0];

      ctx.moveTo(
        Number(first.x) || 0,
        Number(first.y) || 0
      );

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(
          Number(points[i].x) || 0,
          Number(points[i].y) || 0
        );
      }

      ctx.stroke();

      ctx.restore();
      return;
    }

    /* =================================================
       ADVANCED SHAPES
    ================================================= */

    if (points.length < 2) {
      ctx.restore();
      return;
    }

    const start = points[0];
    const end =
      points[points.length - 1];

    const x1 = Number(start.x) || 0;
    const y1 = Number(start.y) || 0;

    const x2 = Number(end.x) || 0;
    const y2 = Number(end.y) || 0;

    /* =================================================
       LINE
    ================================================= */

    if (type === "line") {
      ctx.beginPath();

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      ctx.stroke();

      ctx.restore();
      return;
    }

    /* =================================================
       RECTANGLE
    ================================================= */

    if (type === "rectangle") {
      ctx.strokeRect(
        x1,
        y1,
        x2 - x1,
        y2 - y1
      );

      ctx.restore();
      return;
    }

    /* =================================================
       CIRCLE
    ================================================= */

    if (type === "circle") {
      const dx = x2 - x1;
      const dy = y2 - y1;

      const radius =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      ctx.beginPath();

      ctx.arc(
        x1,
        y1,
        radius,
        0,
        Math.PI * 2
      );

      ctx.stroke();

      ctx.restore();
      return;
    }

    /* =================================================
       ARROW
    ================================================= */

    if (type === "arrow") {
      ctx.beginPath();

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      ctx.stroke();

      const angle =
        Math.atan2(
          y2 - y1,
          x2 - x1
        );

      const arrowSize = 12;

      ctx.beginPath();

      ctx.moveTo(
        x2,
        y2
      );

      ctx.lineTo(
        x2 -
          arrowSize *
            Math.cos(
              angle - Math.PI / 6
            ),
        y2 -
          arrowSize *
            Math.sin(
              angle - Math.PI / 6
            )
      );

      ctx.moveTo(
        x2,
        y2
      );

      ctx.lineTo(
        x2 -
          arrowSize *
            Math.cos(
              angle + Math.PI / 6
            ),
        y2 -
          arrowSize *
            Math.sin(
              angle + Math.PI / 6
            )
      );

      ctx.stroke();

      ctx.restore();
      return;
    }

    ctx.restore();
  }, []);

  /* =====================================================
     CLEAR CANVAS
  ===================================================== */

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const width =
      canvas.clientWidth;

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const dpr =
      window.devicePixelRatio || 1;

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      0,
      width,
      CANVAS_HEIGHT
    );
  }, []);

  /* =====================================================
     REDRAW
  ===================================================== */

  const redrawCanvas = useCallback(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    clearCanvas();

    lines.forEach((object) => {
      drawObject(ctx, object);
    });
  }, [
    lines,
    drawObject,
    clearCanvas,
  ]);

  /* =====================================================
     RESIZE
  ===================================================== */

  const resizeCanvas = useCallback(() => {
    const canvas =
      canvasRef.current;

    const container =
      containerRef.current;

    if (!canvas || !container) {
      return;
    }

    const rect =
      container.getBoundingClientRect();

    const width =
      Math.max(
        Math.floor(rect.width),
        300
      );

    const dpr =
      window.devicePixelRatio || 1;

    canvas.width =
      Math.floor(width * dpr);

    canvas.height =
      Math.floor(
        CANVAS_HEIGHT * dpr
      );

    canvas.style.width =
      `${width}px`;

    canvas.style.height =
      `${CANVAS_HEIGHT}px`;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    ctx.fillStyle =
      "#ffffff";

    ctx.fillRect(
      0,
      0,
      width,
      CANVAS_HEIGHT
    );

    lines.forEach((object) => {
      drawObject(
        ctx,
        object
      );
    });
  }, [
    lines,
    drawObject,
  ]);

  /* =====================================================
     RESIZE LISTENER
  ===================================================== */

  useEffect(() => {
    resizeCanvas();

    const handleResize =
      () => {
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

  /* =====================================================
     REDRAW
  ===================================================== */

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  /* =====================================================
     YJS CONNECTION
  ===================================================== */

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
      room =
        createRoomProvider(
          joinedRoom,
          {
            name: "Whiteboard User",
          }
        );

      const {
        provider,
        whiteboard,
        whiteboardRedo,
      } = room;

      providerRef.current =
        provider;

      yBoardRef.current =
        whiteboard;

      yRedoRef.current =
        whiteboardRedo;

      const handleStatus =
        ({ status }) => {
          setYjsConnected(
            status === "connected"
          );
        };

      const handleSync =
        (isSynced) => {
          if (!isSynced) return;

          setLines(
            readArray(
              whiteboard
            )
          );

          setRedoStack(
            readArray(
              whiteboardRedo
            )
          );

          setYjsConnected(true);
        };

      const handleBoardChange =
        () => {
          setLines(
            readArray(
              whiteboard
            )
          );
        };

      const handleRedoChange =
        () => {
          setRedoStack(
            readArray(
              whiteboardRedo
            )
          );
        };

      provider.on(
        "status",
        handleStatus
      );

      provider.on(
        "sync",
        handleSync
      );

      whiteboard.observe(
        handleBoardChange
      );

      whiteboardRedo.observe(
        handleRedoChange
      );

      setLines(
        readArray(
          whiteboard
        )
      );

      setRedoStack(
        readArray(
          whiteboardRedo
        )
      );

      return () => {
        provider.off(
          "status",
          handleStatus
        );

        provider.off(
          "sync",
          handleSync
        );

        whiteboard.unobserve(
          handleBoardChange
        );

        whiteboardRedo.unobserve(
          handleRedoChange
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
        "Yjs connection failed:",
        error
      );

      setYjsConnected(false);
    }
  }, [
    joinedRoom,
    setLines,
    setRedoStack,
    readArray,
  ]);

  /* =====================================================
     POINTER POSITION
  ===================================================== */

  const getPoint =
    useCallback(
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
      []
    );

  /* =====================================================
     START DRAWING
  ===================================================== */

  const startDrawing =
    useCallback(
      (event) => {
        if (!joinedRoom) return;

        const provider =
          providerRef.current;

        if (!provider) return;

        if (
          event.pointerType ===
            "mouse" &&
          event.button !== 0
        ) {
          return;
        }

        const canvas =
          canvasRef.current;

        if (!canvas) return;

        event.preventDefault();

        canvas.setPointerCapture?.(
          event.pointerId
        );

        const point =
          getPoint(event);

        const safeSize =
          Number(
            brushSize
          ) || 4;

        const actualSize =
          tool === "eraser"
            ? Math.max(
                safeSize * 3,
                12
              )
            : safeSize;

        const object = {
          id:
            crypto.randomUUID?.() ||
            `${Date.now()}-${Math.random()}`,

          type: tool,

          tool,

          points: [
            point,
          ],

          color:
            tool === "eraser"
              ? "#ffffff"
              : color,

          brushSize:
            actualSize,
        };

        drawingRef.current =
          true;

        currentObjectRef.current =
          object;

        setLines(
          (previous) => [
            ...previous,
            object,
          ]
        );

        const ctx =
          canvas.getContext(
            "2d"
          );

        if (ctx) {
          drawObject(
            ctx,
            object
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
        drawObject,
      ]
    );

  /* =====================================================
     DRAW
  ===================================================== */

  const draw =
    useCallback(
      (event) => {
        if (
          !drawingRef.current
        ) {
          return;
        }

        const current =
          currentObjectRef.current;

        if (!current) return;

        event.preventDefault();

        const point =
          getPoint(event);

        const type =
          current.type;

        let updatedObject;

        if (
          type === "pen" ||
          type === "eraser"
        ) {
          updatedObject = {
            ...current,

            points: [
              ...current.points,
              point,
            ],
          };
        } else {
          updatedObject = {
            ...current,

            points: [
              current.points[0],
              point,
            ],
          };
        }

        currentObjectRef.current =
          updatedObject;

        setLines(
          (previous) => {
            if (
              previous.length === 0
            ) {
              return previous;
            }

            const copy = [
              ...previous,
            ];

            const index =
              copy.length - 1;

            if (
              copy[index]?.id !==
              current.id
            ) {
              return previous;
            }

            copy[index] =
              updatedObject;

            return copy;
          }
        );
      },
      [
        getPoint,
        setLines,
      ]
    );

  /* =====================================================
     STOP DRAWING
  ===================================================== */

  const stopDrawing =
    useCallback(
      (event) => {
        if (
          !drawingRef.current
        ) {
          return;
        }

        drawingRef.current =
          false;

        event?.preventDefault();

        const canvas =
          canvasRef.current;

        canvas?.releasePointerCapture?.(
          event?.pointerId
        );

        const object =
          currentObjectRef.current;

        currentObjectRef.current =
          null;

        if (!object) return;

        const yBoard =
          yBoardRef.current;

        const provider =
          providerRef.current;

        if (
          !yBoard ||
          !provider
        ) {
          return;
        }

        if (
          !Array.isArray(
            object.points
          )
        ) {
          return;
        }

        if (
          object.points.length <
          1
        ) {
          return;
        }

        provider.doc.transact(
          () => {
            yBoard.push([
              JSON.stringify(
                object
              ),
            ]);

            const yRedo =
              yRedoRef.current;

            if (
              yRedo &&
              yRedo.length > 0
            ) {
              yRedo.delete(
                0,
                yRedo.length
              );
            }
          }
        );
      },
      []
    );

  /* =====================================================
     UNDO
  ===================================================== */

  const undo =
    useCallback(() => {
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
          yBoard.length - 1
        );

      provider.doc.transact(
        () => {
          yBoard.delete(
            yBoard.length - 1,
            1
          );

          yRedo.push([
            last,
          ]);
        }
      );
    }, []);

  /* =====================================================
     REDO
  ===================================================== */

  const redo =
    useCallback(() => {
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
          yRedo.length - 1
        );

      provider.doc.transact(
        () => {
          yRedo.delete(
            yRedo.length - 1,
            1
          );

          yBoard.push([
            last,
          ]);
        }
      );
    }, []);

  /* =====================================================
     CLEAR
  ===================================================== */

  const clearBoard =
    useCallback(() => {
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
          "Clear entire whiteboard?"
        )
      ) {
        return;
      }

      provider.doc.transact(
        () => {
          yBoard.delete(
            0,
            yBoard.length
          );

          yRedo.delete(
            0,
            yRedo.length
          );
        }
      );

      setLines([]);
      setRedoStack([]);
      setHistory?.([]);
    }, [
      setLines,
      setRedoStack,
      setHistory,
    ]);

  /* =====================================================
     TOOL BUTTON
  ===================================================== */

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
        padding:
          "8px 11px",

        border:
          active
            ? "1px solid #60a5fa"
            : "1px solid #334155",

        borderRadius:
          "8px",

        background:
          active
            ? "#1d4ed8"
            : "#1e293b",

        color:
          "#f8fafc",

        cursor:
          "pointer",

        fontWeight:
          600,

        fontSize:
          "13px",
      }}
    >
      {icon} {label}
    </button>
  );

  /* =====================================================
     TOOL NAME
  ===================================================== */

  const toolName =
    tool === "rectangle"
      ? "Rectangle"
      : tool === "circle"
      ? "Circle"
      : tool === "line"
      ? "Line"
      : tool === "arrow"
      ? "Arrow"
      : tool === "eraser"
      ? "Eraser"
      : "Pen";

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div
      style={{
        width: "100%",
        marginTop: "18px",
        background: "#020617",
        border:
          "1px solid #1e293b",
        borderRadius: "18px",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          padding:
            "16px 20px",

          display: "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          background:
            "#111827",

          color:
            "#f8fafc",

          gap: "12px",

          flexWrap:
            "wrap",
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
              color:
                "#94a3b8",
            }}
          >
            Collaborative Whiteboard
          </small>
        </div>

        <div
          style={{
            color:
              yjsConnected
                ? "#4ade80"
                : "#f87171",

            fontWeight:
              600,
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
          padding:
            "12px 16px",

          display: "flex",

          gap: "7px",

          flexWrap: "wrap",

          alignItems:
            "center",

          background:
            "#0b1220",
        }}
      >
        <ToolButton
          active={
            tool === "pen"
          }
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

        <ToolButton
          active={
            tool === "line"
          }
          icon="╱"
          label="Line"
          onClick={() =>
            setTool("line")
          }
        />

        <ToolButton
          active={
            tool === "rectangle"
          }
          icon="▭"
          label="Rectangle"
          onClick={() =>
            setTool(
              "rectangle"
            )
          }
        />

        <ToolButton
          active={
            tool === "circle"
          }
          icon="⭕"
          label="Circle"
          onClick={() =>
            setTool("circle")
          }
        />

        <ToolButton
          active={
            tool === "arrow"
          }
          icon="➡️"
          label="Arrow"
          onClick={() =>
            setTool("arrow")
          }
        />

        <input
          type="color"
          value={color}
          disabled={
            tool === "eraser"
          }
          onChange={(event) =>
            setColor(
              event.target.value
            )
          }
          title="Choose color"
          style={{
            width: "42px",
            height: "34px",
            cursor:
              "pointer",
          }}
        />

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
        />

        <span
          style={{
            color:
              "#cbd5e1",
            minWidth:
              "40px",
            fontSize:
              "13px",
          }}
        >
          {brushSize}px
        </span>

        <div
          style={{
            flex: 1,
            minWidth:
              "10px",
          }}
        />

        <button
          type="button"
          onClick={undo}
          disabled={
            !yjsConnected ||
            lines.length === 0
          }
          style={{
            padding:
              "8px 12px",
            cursor:
              "pointer",
          }}
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
          style={{
            padding:
              "8px 12px",
            cursor:
              "pointer",
          }}
        >
          ↪ Redo
        </button>

        <button
          type="button"
          onClick={
            clearBoard
          }
          disabled={
            !yjsConnected ||
            lines.length === 0
          }
          style={{
            padding:
              "8px 12px",
            cursor:
              "pointer",
          }}
        >
          🗑 Clear
        </button>
      </div>

      {/* CANVAS */}

      <div
        style={{
          padding:
            "16px",
          background:
            "#020617",
        }}
      >
        <div
          ref={
            containerRef
          }
          style={{
            width:
              "100%",

            height:
              `${CANVAS_HEIGHT}px`,

            background:
              "#ffffff",

            borderRadius:
              "12px",

            overflow:
              "hidden",

            position:
              "relative",
          }}
        >
          <canvas
            ref={
              canvasRef
            }
            onPointerDown={
              startDrawing
            }
            onPointerMove={
              draw
            }
            onPointerUp={
              stopDrawing
            }
            onPointerCancel={
              stopDrawing
            }
            style={{
              display:
                "block",

              width:
                "100%",

              height:
                `${CANVAS_HEIGHT}px`,

              touchAction:
                "none",

              userSelect:
                "none",

              WebkitUserSelect:
                "none",

              cursor:
                tool ===
                "eraser"
                  ? "cell"
                  : "crosshair",
            }}
          />
        </div>
      </div>

      {/* FOOTER */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap:
            "12px",

          padding:
            "9px 16px",

          color:
            "#94a3b8",

          fontSize:
            "12px",

          flexWrap:
            "wrap",
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
            {toolName}
          </strong>
        </span>

        <span>
          {joinedRoom
            ? `🟢 Yjs live sync • ${lines.length} objects`
            : "🔴 Join a workspace first"}
        </span>
      </div>
    </div>
  );
}

export default Whiteboard;

