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
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

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
    setOutput("");
  };

  // =========================
  // RUN JAVASCRIPT
  // =========================

  const runJavaScript = () => {
    if (!code.trim()) {
      setOutput("No code to run.");
      return;
    }

    setIsRunning(true);
    setOutput("");

    const logs = [];

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    try {
      // Capture console.log
      console.log = (...args) => {
        logs.push(
          args
            .map((item) => {
              if (typeof item === "object") {
                try {
                  return JSON.stringify(item, null, 2);
                } catch {
                  return String(item);
                }
              }

              return String(item);
            })
            .join(" ")
        );
      };

      // Capture console.warn
      console.warn = (...args) => {
        logs.push(
          "⚠️ " +
            args
              .map((item) => String(item))
              .join(" ")
        );
      };

      // Capture console.error
      console.error = (...args) => {
        logs.push(
          "❌ " +
            args
              .map((item) => String(item))
              .join(" ")
        );
      };

      // Basic JavaScript execution
      // Day 26 mein proper sandbox/API execution add karenge.
      const execute = new Function(code);

      const result = execute();

      if (result !== undefined) {
        logs.push(String(result));
      }

      if (logs.length === 0) {
        logs.push("✅ Code executed successfully.");
      }

      setOutput(logs.join("\n"));
    } catch (error) {
      setOutput(
        `❌ ${error.name}: ${error.message}`
      );
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;

      setIsRunning(false);
    }
  };

  // =========================
  // RUN CODE
  // =========================

  const runCode = () => {
    if (language !== "javascript") {
      setOutput(
        `⚠️ ${language} execution is not available yet.\n\n` +
          "Currently only JavaScript execution is supported.\n" +
          "Python, C++, Java etc. will be added in the execution-engine phase."
      );

      return;
    }

    runJavaScript();
  };

  // =========================
  // CLEAR OUTPUT
  // =========================

  const clearOutput = () => {
    setOutput("");
  };

  // =========================
  // SAVE SHORTCUT
  // =========================

  const handleEditorKeyDown = (event) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "s"
    ) {
      event.preventDefault();

      console.log("Code saved locally");
    }

    // Ctrl + Enter = Run
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "Enter"
    ) {
      event.preventDefault();

      runCode();
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
            onChange={(e) =>
              setLanguage(e.target.value)
            }
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "none",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="javascript">
              JavaScript
            </option>

            <option value="typescript">
              TypeScript
            </option>

            <option value="python">
              Python
            </option>

            <option value="java">
              Java
            </option>

            <option value="cpp">
              C++
            </option>

            <option value="html">
              HTML
            </option>

            <option value="css">
              CSS
            </option>

            <option value="json">
              JSON
            </option>
          </select>

          {/* RUN */}

          <button
            type="button"
            onClick={runCode}
            disabled={isRunning}
            style={{
              padding: "8px 15px",
              background: isRunning
                ? "#475569"
                : "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: isRunning
                ? "not-allowed"
                : "pointer",
              fontWeight: "700",
            }}
          >
            {isRunning
              ? "⏳ Running..."
              : "▶ Run"}
          </button>

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
            {copied
              ? "✅ Copied"
              : "📋 Copy"}
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

            lineNumbers: "on",

            minimap: {
              enabled: false,
            },

            automaticLayout: true,

            wordWrap: "on",

            smoothScrolling: true,

            cursorBlinking: "smooth",

            suggestOnTriggerCharacters: true,

            formatOnPaste: true,

            formatOnType: true,

            bracketPairColorization: {
              enabled: true,
            },

            scrollBeyondLastLine: false,

            quickSuggestions: true,
          }}
          onKeyDown={handleEditorKeyDown}
        />
      </div>

      {/* =========================
          OUTPUT
      ========================= */}

      <div
        style={{
          marginTop: "15px",
          background: "#020617",
          border: "1px solid #334155",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {/* OUTPUT HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom:
              "1px solid #334155",
          }}
        >
          <strong
            style={{
              color: "#e2e8f0",
              fontSize: "14px",
            }}
          >
            📤 Output
          </strong>

          <button
            type="button"
            onClick={clearOutput}
            style={{
              padding: "5px 10px",
              background: "#334155",
              color: "#cbd5e1",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Clear
          </button>
        </div>

        {/* OUTPUT CONTENT */}

        <pre
          style={{
            margin: 0,
            padding: "15px",
            minHeight: "100px",
            maxHeight: "250px",
            overflow: "auto",
            color: output.startsWith("❌")
              ? "#fca5a5"
              : "#86efac",
            fontFamily:
              "Consolas, Monaco, monospace",
            fontSize: "13px",
            whiteSpace: "pre-wrap",
          }}
        >
          {output ||
            "▶ Click Run to execute your JavaScript code."}
        </pre>
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
          <strong
            style={{
              color: "white",
            }}
          >
            {language}
          </strong>
        </span>

        <span>
          Lines:{" "}
          <strong
            style={{
              color: "white",
            }}
          >
            {(code || "").split("\n").length}
          </strong>
        </span>

        <span>
          Characters:{" "}
          <strong
            style={{
              color: "white",
            }}
          >
            {(code || "").length}
          </strong>
        </span>

        <span>
          💡 Ctrl + Enter = Run
        </span>

        <span>
          Ctrl + S = Save
        </span>
      </div>
    </div>
  );
}

export default CodeEditor;