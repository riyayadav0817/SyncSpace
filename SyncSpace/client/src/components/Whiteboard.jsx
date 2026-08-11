import { Stage, Layer, Line } from "react-konva";

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
  const startDrawing = (event) => {
    if (!joinedRoom) {
      alert("Please join a room first");
      return;
    }

    setIsDrawing(true);

    const stage = event.target.getStage();
    const point = stage.getPointerPosition();

    if (!point) return;

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

    if (!point) return;

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

  return (
    <div
      style={{
        background: "#1e293b",
        padding: "20px",
        borderRadius: "12px",
        marginTop: "20px",
      }}
    >
      {/* Header */}

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
          {/* Color */}

          <label>
            Color:{" "}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>

          {/* Brush */}

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

          {/* Clear */}

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

      {/* Canvas */}

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
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
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

      {/* Room message */}

      {!joinedRoom && (
        <p
          style={{
            textAlign: "center",
            color: "#94a3b8",
            marginTop: "15px",
          }}
        >
          Join a room first, then start drawing.
        </p>
      )}
    </div>
  );
}

export default Whiteboard;

