import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Stage,
  Layer,
  Line,
  Rect,
  Circle,
  Arrow,
} from "react-konva";

function KonvaWhiteboard({
  joinedRoom,
  lines,
  setLines,
  color,
  setColor,
  brushSize,
  setBrushSize,
  socket,
}) {
  const stageRef = useRef(null);
  const containerRef = useRef(null);

  const isDrawing = useRef(false);
  const currentObjectRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [stageWidth, setStageWidth] = useState(800);

  const CANVAS_HEIGHT = 600;

  // =========================================================
  // GENERATE UNIQUE ID
  // =========================================================

  const createId = () => {
    return `${socket?.id || "user"}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  };

  // =========================================================
  // SOCKET — ROOM STATE
  // =========================================================

  useEffect(() => {
    if (!socket || !joinedRoom) {
      return;
    }

    const handleRoomState = (state) => {
      if (!state) {
        return;
      }

      if (Array.isArray(state.lines)) {
        setLines(state.lines);
      }
    };

    socket.on("room-state", handleRoomState);

    return () => {
      socket.off("room-state", handleRoomState);
    };
  }, [
    socket,
    joinedRoom,
    setLines,
  ]);

  // =========================================================
  // SOCKET — REMOTE DRAW
  // =========================================================

  useEffect(() => {
    if (!socket || !joinedRoom) {
      return;
    }

    const handleRemoteDraw = (object) => {
      if (!object) {
        return;
      }

      if (!object.id) {
        return;
      }

      if (
        !Array.isArray(object.points) ||
        object.points.length < 2
      ) {
        return;
      }

      setLines((previous) => {
        const exists = previous.some(
          (item) => item.id === object.id
        );

        if (exists) {
          return previous;
        }

        return [
          ...previous,
          object,
        ];
      });
    };

    socket.on(
      "draw-line",
      handleRemoteDraw
    );

    return () => {
      socket.off(
        "draw-line",
        handleRemoteDraw
      );
    };
  }, [
    socket,
    joinedRoom,
    setLines,
  ]);

  // =========================================================
  // SOCKET — AUTHORITATIVE BOARD STATE
  // =========================================================

  useEffect(() => {
    if (!socket || !joinedRoom) {
      return;
    }

    const handleBoardState = (data) => {
      if (!Array.isArray(data?.lines)) {
        return;
      }

      setLines(data.lines);
    };

    socket.on(
      "board-state",
      handleBoardState
    );

    return () => {
      socket.off(
        "board-state",
        handleBoardState
      );
    };
  }, [
    socket,
    joinedRoom,
    setLines,
  ]);

  // =========================================================
  // SOCKET — CLEAR
  // =========================================================

  useEffect(() => {
    if (!socket || !joinedRoom) {
      return;
    }

    const handleClear = () => {
      setLines([]);
    };

    socket.on(
      "clear-board",
      handleClear
    );

    return () => {
      socket.off(
        "clear-board",
        handleClear
      );
    };
  }, [
    socket,
    joinedRoom,
    setLines,
  ]);

  // =========================================================
  // RESPONSIVE WIDTH
  // =========================================================

  useEffect(() => {
    const updateStageSize = () => {
      if (!containerRef.current) {
        return;
      }

      const width = Math.max(
        containerRef.current.clientWidth,
        300
      );

      setStageWidth(width);
    };

    updateStageSize();

    window.addEventListener(
      "resize",
      updateStageSize
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateStageSize
      );
    };
  }, []);

  // =========================================================
  // GET POINTER POSITION
  // =========================================================

  const getPointerPosition = () => {
    const stage = stageRef.current;

    if (!stage) {
      return null;
    }

    return stage.getPointerPosition();
  };

  // =========================================================
  // START DRAWING
  // =========================================================

  const handlePointerDown = (event) => {
    if (!joinedRoom) {
      return;
    }

    if (
      event.evt?.pointerType === "mouse" &&
      event.evt?.button !== 0
    ) {
      return;
    }

    const position =
      getPointerPosition();

    if (!position) {
      return;
    }

    isDrawing.current = true;

    const baseObject = {
      id: createId(),

      type: tool,

      color:
        tool === "eraser"
          ? "#ffffff"
          : color,

      brushSize:
        tool === "eraser"
          ? Math.max(
              brushSize * 3,
              12
            )
          : brushSize,

      points: [
        position.x,
        position.y,
      ],
    };

    currentObjectRef.current =
      baseObject;

    setLines((previous) => [
      ...previous,
      baseObject,
    ]);
  };

  // =========================================================
  // DRAW / LIVE PREVIEW
  // =========================================================

  const handlePointerMove = () => {
    if (!isDrawing.current) {
      return;
    }

    const position =
      getPointerPosition();

    if (!position) {
      return;
    }

    const current =
      currentObjectRef.current;

    if (!current) {
      return;
    }

    setLines((previous) => {
      if (previous.length === 0) {
        return previous;
      }

      const updated = [
        ...previous,
      ];

      const lastIndex =
        updated.length - 1;

      const existing =
        updated[lastIndex];

      if (
        !existing ||
        existing.id !== current.id
      ) {
        return previous;
      }

      let updatedObject;

      // -------------------------------------------------------
      // PEN / ERASER
      // -------------------------------------------------------

      if (
        current.type === "pen" ||
        current.type === "eraser"
      ) {
        updatedObject = {
          ...existing,

          points: [
            ...existing.points,
            position.x,
            position.y,
          ],
        };
      }

      // -------------------------------------------------------
      // RECTANGLE / CIRCLE / LINE / ARROW
      // -------------------------------------------------------

      else {
        updatedObject = {
          ...existing,

          points: [
            existing.points[0],
            existing.points[1],
            position.x,
            position.y,
          ],
        };
      }

      updated[lastIndex] =
        updatedObject;

      currentObjectRef.current =
        updatedObject;

      return updated;
    });
  };

  // =========================================================
  // STOP DRAWING
  // =========================================================

  const handlePointerUp = () => {
    if (!isDrawing.current) {
      return;
    }

    isDrawing.current = false;

    const completedObject =
      currentObjectRef.current;

    currentObjectRef.current = null;

    if (!completedObject) {
      return;
    }

    if (
      !socket ||
      !socket.connected ||
      !joinedRoom
    ) {
      return;
    }

    if (
      !Array.isArray(
        completedObject.points
      )
    ) {
      return;
    }

    if (
      completedObject.points.length < 2
    ) {
      return;
    }

    // -------------------------------------------------------
    // SEND COMPLETE OBJECT ONCE
    // -------------------------------------------------------

    socket.emit(
      "draw-line",
      {
        roomId: joinedRoom,

        id: completedObject.id,

        type: completedObject.type,

        points:
          completedObject.points,

        color:
          completedObject.color ||
          "#2563eb",

        brushSize:
          completedObject.brushSize ||
          4,

        tool:
          completedObject.type,
      }
    );
  };

  // =========================================================
  // UNDO
  // =========================================================

  const undo = () => {
    if (
      !socket ||
      !socket.connected ||
      !joinedRoom
    ) {
      return;
    }

    socket.emit(
      "undo",
      {
        roomId: joinedRoom,
      }
    );
  };

  // =========================================================
  // REDO
  // =========================================================

  const redo = () => {
    if (
      !socket ||
      !socket.connected ||
      !joinedRoom
    ) {
      return;
    }

    socket.emit(
      "redo",
      {
        roomId: joinedRoom,
      }
    );
  };

  // =========================================================
  // CLEAR
  // =========================================================

  const clearBoard = () => {
    if (
      !joinedRoom ||
      !socket ||
      !socket.connected
    ) {
      return;
    }

    if (lines.length === 0) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to clear the entire whiteboard?"
      );

    if (!confirmed) {
      return;
    }

    socket.emit(
      "clear-board",
      {
        roomId: joinedRoom,
      }
    );
  };

  // =========================================================
  // TOOL BUTTON
  // =========================================================

  const ToolButton = ({
    active,
    label,
    onClick,
  }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          padding: "8px 11px",
          borderRadius: "7px",

          border: active
            ? "1px solid #60a5fa"
            : "1px solid #334155",

          background: active
            ? "#1d4ed8"
            : "#1e293b",

          color: "#f8fafc",

          cursor: "pointer",

          fontWeight: 600,

          fontSize: "13px",
        }}
      >
        {label}
      </button>
    );
  };

  // =========================================================
  // RENDER OBJECT
  // =========================================================

  const renderObject = (
    object,
    index
  ) => {
    if (!object) {
      return null;
    }

    const key =
      object.id || index;

    const points =
      Array.isArray(object.points)
        ? object.points
        : [];

    // -------------------------------------------------------
    // PEN / ERASER
    // -------------------------------------------------------

    if (
      object.type === "pen" ||
      object.type === "eraser" ||
      !object.type
    ) {
      return (
        <Line
          key={key}
          points={points}
          stroke={
            object.type ===
              "eraser" ||
            object.tool ===
              "eraser"
              ? "#ffffff"
              : object.color ||
                "#2563eb"
          }
          strokeWidth={
            object.type ===
              "eraser" ||
            object.tool ===
              "eraser"
              ? (
                  object.brushSize ||
                  4
                ) * 3
              : object.brushSize ||
                4
          }
          tension={0.2}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation={
            object.type ===
              "eraser" ||
            object.tool ===
              "eraser"
              ? "destination-out"
              : "source-over"
          }
        />
      );
    }

    if (points.length < 4) {
      return null;
    }

    const x1 = points[0];
    const y1 = points[1];

    const x2 = points[2];
    const y2 = points[3];

    // -------------------------------------------------------
    // RECTANGLE
    // -------------------------------------------------------

    if (
      object.type ===
      "rectangle"
    ) {
      return (
        <Rect
          key={key}
          x={x1}
          y={y1}
          width={x2 - x1}
          height={y2 - y1}
          stroke={
            object.color ||
            "#2563eb"
          }
          strokeWidth={
            object.brushSize ||
            4
          }
        />
      );
    }

    // -------------------------------------------------------
    // CIRCLE
    // -------------------------------------------------------

    if (
      object.type ===
      "circle"
    ) {
      const dx = x2 - x1;
      const dy = y2 - y1;

      const radius =
        Math.sqrt(
          dx * dx +
            dy * dy
        );

      return (
        <Circle
          key={key}
          x={x1}
          y={y1}
          radius={radius}
          stroke={
            object.color ||
            "#2563eb"
          }
          strokeWidth={
            object.brushSize ||
            4
          }
        />
      );
    }

    // -------------------------------------------------------
    // LINE
    // -------------------------------------------------------

    if (
      object.type ===
      "line"
    ) {
      return (
        <Line
          key={key}
          points={[
            x1,
            y1,
            x2,
            y2,
          ]}
          stroke={
            object.color ||
            "#2563eb"
          }
          strokeWidth={
            object.brushSize ||
            4
          }
          lineCap="round"
        />
      );
    }

    // -------------------------------------------------------
    // ARROW
    // -------------------------------------------------------

    if (
      object.type ===
      "arrow"
    ) {
      return (
        <Arrow
          key={key}
          points={[
            x1,
            y1,
            x2,
            y2,
          ]}
          stroke={
            object.color ||
            "#2563eb"
          }
          fill={
            object.color ||
            "#2563eb"
          }
          strokeWidth={
            object.brushSize ||
            4
          }
          pointerLength={10}
          pointerWidth={10}
          lineCap="round"
          lineJoin="round"
        />
      );
    }

    return null;
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      style={{
        width: "100%",
        marginTop: "20px",
        background: "#020617",
        border: "1px solid #1e293b",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow:
          "0 20px 50px rgba(0,0,0,0.25)",
      }}
    >
      {/* =====================================================
          TOOLBAR
      ====================================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px",
          background: "#0f172a",
          borderBottom:
            "1px solid #1e293b",
          flexWrap: "wrap",
        }}
      >
        <ToolButton
          active={tool === "pen"}
          label="✏️ Pen"
          onClick={() =>
            setTool("pen")
          }
        />

        <ToolButton
          active={
            tool === "eraser"
          }
          label="🧹 Eraser"
          onClick={() =>
            setTool("eraser")
          }
        />

        <ToolButton
          active={
            tool === "rectangle"
          }
          label="▭ Rectangle"
          onClick={() =>
            setTool("rectangle")
          }
        />

        <ToolButton
          active={
            tool === "circle"
          }
          label="⭕ Circle"
          onClick={() =>
            setTool("circle")
          }
        />

        <ToolButton
          active={tool === "line"}
          label="╱ Line"
          onClick={() =>
            setTool("line")
          }
        />

        <ToolButton
          active={
            tool === "arrow"
          }
          label="➡️ Arrow"
          onClick={() =>
            setTool("arrow")
          }
        />

        {/* DIVIDER */}

        <div
          style={{
            width: "1px",
            height: "28px",
            background: "#334155",
            margin: "0 3px",
          }}
        />

        {/* COLOR */}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 8px",
            border:
              "1px solid #334155",
            borderRadius: "7px",
            background: "#1e293b",
            color: "#cbd5e1",
            fontSize: "12px",
          }}
        >
          🎨

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
              cursor:
                tool === "eraser"
                  ? "not-allowed"
                  : "pointer",
              opacity:
                tool === "eraser"
                  ? 0.5
                  : 1,
            }}
          />
        </label>

        {/* BRUSH */}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "7px 10px",
            border:
              "1px solid #334155",
            borderRadius: "7px",
            background: "#1e293b",
            color: "#cbd5e1",
            fontSize: "12px",
          }}
        >
          📏

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

          <strong
            style={{
              minWidth: "32px",
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
            !joinedRoom ||
            !socket?.connected
          }
          title="Undo"
          style={{
            padding:
              "8px 12px",
            border:
              "1px solid #334155",
            borderRadius: "7px",
            background: "#1e293b",
            color: "#f8fafc",
            cursor:
              joinedRoom &&
              socket?.connected
                ? "pointer"
                : "not-allowed",
            opacity:
              joinedRoom &&
              socket?.connected
                ? 1
                : 0.45,
            fontSize: "16px",
          }}
        >
          ↩
        </button>

        {/* REDO */}

        <button
          type="button"
          onClick={redo}
          disabled={
            !joinedRoom ||
            !socket?.connected
          }
          title="Redo"
          style={{
            padding:
              "8px 12px",
            border:
              "1px solid #334155",
            borderRadius: "7px",
            background: "#1e293b",
            color: "#f8fafc",
            cursor:
              joinedRoom &&
              socket?.connected
                ? "pointer"
                : "not-allowed",
            opacity:
              joinedRoom &&
              socket?.connected
                ? 1
                : 0.45,
            fontSize: "16px",
          }}
        >
          ↪
        </button>

        {/* CLEAR */}

        <button
          type="button"
          onClick={clearBoard}
          disabled={
            lines.length === 0
          }
          style={{
            padding:
              "8px 12px",
            border:
              "1px solid #7f1d1d",
            borderRadius: "7px",
            background: "#dc2626",
            color: "#ffffff",
            cursor:
              lines.length === 0
                ? "not-allowed"
                : "pointer",
            opacity:
              lines.length === 0
                ? 0.5
                : 1,
            fontWeight: 600,
          }}
        >
          🗑 Clear
        </button>

        {/* ROOM */}

        <span
          style={{
            color:
              joinedRoom
                ? "#4ade80"
                : "#f87171",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {joinedRoom
            ? `🟢 Room ${joinedRoom}`
            : "🔴 Not connected"}
        </span>
      </div>

      {/* =====================================================
          CANVAS
      ====================================================== */}

      <div
        style={{
          padding: "16px",
          background: "#020617",
        }}
      >
        <div
          ref={containerRef}
          style={{
            position: "relative",
            width: "100%",
            height: `${CANVAS_HEIGHT}px`,
            background: "#ffffff",
            borderRadius: "10px",
            overflow: "hidden",
            border:
              "1px solid #cbd5e1",
          }}
        >
          <Stage
            ref={stageRef}
            width={stageWidth}
            height={CANVAS_HEIGHT}
            onPointerDown={
              handlePointerDown
            }
            onPointerMove={
              handlePointerMove
            }
            onPointerUp={
              handlePointerUp
            }
            onPointerLeave={
              handlePointerUp
            }
            onPointerCancel={
              handlePointerUp
            }
          >
            <Layer>
              {lines.map(
                (
                  object,
                  index
                ) =>
                  renderObject(
                    object,
                    index
                  )
              )}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "12px",
          padding: "8px 12px",
          background: "#0f172a",
          borderTop:
            "1px solid #1e293b",
          color: "#64748b",
          fontSize: "11px",
          flexWrap: "wrap",
        }}
      >
        <span>
          Tool:{" "}
          <strong
            style={{
              color: "#cbd5e1",
            }}
          >
            {tool === "rectangle"
              ? "Rectangle"
              : tool === "circle"
              ? "Circle"
              : tool === "line"
              ? "Line"
              : tool === "arrow"
              ? "Arrow"
              : tool === "eraser"
              ? "Eraser"
              : "Pen"}
          </strong>
        </span>

        <span>
          Objects:{" "}
          <strong
            style={{
              color: "#cbd5e1",
            }}
          >
            {lines.length}
          </strong>
        </span>

        <span>
          Brush:{" "}
          <strong
            style={{
              color: "#cbd5e1",
            }}
          >
            {brushSize}px
          </strong>
        </span>

        <span>
          {socket?.connected
            ? "🟢 Socket connected"
            : "⚪ Socket disconnected"}
        </span>
      </div>
    </div>
  );
}

export default KonvaWhiteboard;