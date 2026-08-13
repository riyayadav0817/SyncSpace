import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

function CodeEditor({
  code,
  setCode,
  language,
  setLanguage,
  joinedRoom,
  socket,
}) {
  const editorRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // =========================
  // RECEIVE CODE FROM SERVER
  // =========================

  useEffect(() => {
    if (!socket) return;

    const handleCodeUpdate = (data) => {
      if (!data || typeof data.code !== "string") {
        return;
      }

      setCode(data.code);
    };

    socket.on("code-update", handleCodeUpdate);

    return () => {
      socket.off("code-update", handleCodeUpdate);
    };
  }, [socket, setCode]);

  // =========================
  // CODE CHANGE
  // =========================

  const handleCodeChange = (value) => {
    const newCode = value || "";

    setCode(newCode);

    if (!joinedRoom || !socket) {
      return;
    }

    socket.emit("code-change", {
      roomId: joinedRoom,
      code: newCode,
    });
  };

  // =========================
  // EDITOR READY
  // =========================

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  // =========================
  // COPY CODE
  // =========================

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code || "");

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Unable to copy code");
    }
  };

  // =========================
  // CLEAR CODE
  // =========================

  const clearCode = () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear the code?"
    );

    if (!confirmed) {
      return;
    }

    handleCodeChange("");
  };

  // =========================
  // SAVE SHORTCUT
  // =========================

  const handleEditorKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "s") {
      event.preventDefault();

      // Code is already stored in React state.
      console.log("Code saved locally");
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
      {/* =========================
          HEADER
      ========================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "15px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "white",
            }}
          >
            💻 Code Editor
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            {joinedRoom
              ? `🟢 Connected to Room ${joinedRoom}`
              : "🔴 Join a room to collaborate"}
          </p>
        </div>

        {/* =========================
            CONTROLS
        ========================= */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {/* LANGUAGE */}

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "none",
              outline: "none",
              cursor: "pointer",
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

          {/* COPY */}

          <button
            type="button"
            onClick={copyCode}
            style={{
              padding: "8px 13px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {copied ? "✅ Copied" : "📋 Copy"}
          </button>

          {/* CLEAR */}

          <button
            type="button"
            onClick={clearCode}
            style={{
              padding: "8px 13px",
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

      {/* =========================
          EDITOR
      ========================= */}

      <div
        style={{
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid #334155",
        }}
      >
        <Editor
          height="500px"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
          options={{
            fontSize: 15,

            // Line numbers
            lineNumbers: "on",

            // Minimap
            minimap: {
              enabled: false,
            },

            // Layout
            automaticLayout: true,

            // Word wrapping
            wordWrap: "on",

            // Better editing
            smoothScrolling: true,
            cursorBlinking: "smooth",

            // Suggestions
            suggestOnTriggerCharacters: true,

            // Formatting
            formatOnPaste: true,
            formatOnType: true,

            // Bracket matching
            bracketPairColorization: {
              enabled: true,
            },

            // Scroll
            scrollBeyondLastLine: false,

            // Save shortcut handled by us
            quickSuggestions: true,
          }}

          onKeyDown={handleEditorKeyDown}
        />
      </div>

      {/* =========================
          FOOTER
      ========================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "10px",
          color: "#94a3b8",
          fontSize: "13px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span>
          Language:{" "}
          <strong style={{ color: "white" }}>
            {language}
          </strong>
        </span>

        <span>
          Lines:{" "}
          <strong style={{ color: "white" }}>
            {(code || "").split("\n").length}
          </strong>
        </span>

        <span>
          Characters:{" "}
          <strong style={{ color: "white" }}>
            {(code || "").length}
          </strong>
        </span>

        <span>💡 Ctrl + S to save</span>
      </div>
    </div>
  );
}

export default CodeEditor;