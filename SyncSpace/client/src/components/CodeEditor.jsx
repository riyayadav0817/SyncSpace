import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

import { createRoomProvider } from "../collaboration/yjsProvider";

import {
  getOnlineUsers,
  subscribeToAwareness,
} from "../collaboration/awareness";

function CodeEditor({
  code,
  setCode,
  language,
  setLanguage,
  joinedRoom,
  userName,
}) {
  const editorRef = useRef(null);

  const yCodeRef = useRef(null);
  const providerRef = useRef(null);

  const applyingRemoteUpdate = useRef(false);
  const suppressEditorChange = useRef(false);

  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved");

  const [yjsConnected, setYjsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // =========================================================
  // CONNECT YJS + AWARENESS
  // =========================================================

  useEffect(() => {
    if (!joinedRoom) {
      yCodeRef.current = null;
      providerRef.current = null;

      setYjsConnected(false);
      setOnlineUsers([]);

      return;
    }

    let room;

    try {
      room = createRoomProvider(joinedRoom, {
        name: userName || "Anonymous",
      });

      const {
  provider,
  code: yCode,
  awareness,
  setUserName,
} = room;

providerRef.current = provider;
yCodeRef.current = yCode;

setUserName(userName);

      // =====================================================
      // YJS CONNECTION STATUS
      // =====================================================

      const handleStatus = ({ status }) => {
        console.log(`Yjs status: ${status}`);

        setYjsConnected(status === "connected");
      };

      provider.on("status", handleStatus);

      // =====================================================
      // REMOTE CODE CHANGES
      // =====================================================

      const handleYjsChange = () => {
        const newCode = yCode.toString();

        if (editorRef.current) {
          const currentValue = editorRef.current.getValue();

          if (currentValue === newCode) {
            return;
          }
        }

        applyingRemoteUpdate.current = true;
        suppressEditorChange.current = true;

        setCode(newCode);

        if (editorRef.current) {
          const model = editorRef.current.getModel();

          if (model) {
            model.pushEditOperations(
              [],
              [
                {
                  range: model.getFullModelRange(),
                  text: newCode,
                },
              ],
              () => null
            );
          }
        }

        suppressEditorChange.current = false;
        applyingRemoteUpdate.current = false;
      };

      yCode.observe(handleYjsChange);

      // =====================================================
      // ONLINE USERS
      // =====================================================

      const updateUsers = (users) => {
        setOnlineUsers(users);
      };

      const unsubscribeAwareness = subscribeToAwareness(
        awareness,
        updateUsers
      );

      // =====================================================
      // INITIAL CODE
      // =====================================================

      const initialCode = yCode.toString();

      if (initialCode) {
        applyingRemoteUpdate.current = true;
        suppressEditorChange.current = true;

        setCode(initialCode);

        if (editorRef.current) {
          const model = editorRef.current.getModel();

          if (model) {
            model.setValue(initialCode);
          }
        }

        suppressEditorChange.current = false;
        applyingRemoteUpdate.current = false;
      }

      // =====================================================
      // CLEANUP
      // =====================================================

      return () => {
        provider.off("status", handleStatus);

        yCode.unobserve(handleYjsChange);

        unsubscribeAwareness();

        provider.destroy();
        room.doc.destroy();

        yCodeRef.current = null;
        providerRef.current = null;

        setYjsConnected(false);
        setOnlineUsers([]);
      };
    } catch (error) {
      console.error("Yjs connection failed:", error);

      setYjsConnected(false);
      setOnlineUsers([]);
    }
  }, [joinedRoom, userName, setCode]);

  // =========================================================
  // CODE CHANGE
  // =========================================================

  const handleCodeChange = (value) => {
    const newCode = value ?? "";

    setCode(newCode);

    if (
      applyingRemoteUpdate.current ||
      suppressEditorChange.current
    ) {
      return;
    }

    const yCode = yCodeRef.current;

    if (!yCode) {
      return;
    }

    const currentYCode = yCode.toString();

    if (currentYCode === newCode) {
      return;
    }

    yCode.doc.transact(() => {
      yCode.delete(0, yCode.length);

      if (newCode.length > 0) {
        yCode.insert(0, newCode);
      }
    });
  };

  // =========================================================
  // EDITOR MOUNT
  // =========================================================

  const handleEditorMount = (editor) => {
    editorRef.current = editor;

    const yCode = yCodeRef.current;

    if (!yCode) {
      return;
    }

    const currentCode = yCode.toString();

    if (editor.getValue() !== currentCode) {
      applyingRemoteUpdate.current = true;
      suppressEditorChange.current = true;

      editor.setValue(currentCode);
      setCode(currentCode);

      suppressEditorChange.current = false;
      applyingRemoteUpdate.current = false;
    }
  };

  // =========================================================
  // COPY
  // =========================================================

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code || "");

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Copy failed:", error);

      alert("Unable to copy code.");
    }
  };

  // =========================================================
  // CLEAR CODE
  // =========================================================

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

  // =========================================================
  // FORMAT VALUE
  // =========================================================

  const formatValue = (value) => {
    if (
      typeof value === "object" &&
      value !== null
    ) {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }

    return String(value);
  };
  


  // =========================================================
  // RUN JAVASCRIPT
  // =========================================================

  const runJavaScript = () => {
    if (!code.trim()) {
      setOutput("⚠️ No code to run.");
      return;
    }

    setIsRunning(true);
    setOutput("");

    const logs = [];

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    try {
      console.log = (...args) => {
        logs.push(
          args.map(formatValue).join(" ")
        );
      };

      console.warn = (...args) => {
        logs.push(
          `⚠️ ${args.map(formatValue).join(" ")}`
        );
      };

      console.error = (...args) => {
        logs.push(
          `❌ ${args.map(formatValue).join(" ")}`
        );
      };

      console.info = (...args) => {
        logs.push(
          `ℹ️ ${args.map(formatValue).join(" ")}`
        );
      };

      const execute = new Function(code);

      const result = execute();

      if (result !== undefined) {
        logs.push(formatValue(result));
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
      console.info = originalInfo;

      setIsRunning(false);
    }
  };

  // =========================================================
  // RUN CODE
  // =========================================================

  const runCode = () => {
    if (!code.trim()) {
      setOutput("⚠️ No code to run.");
      return;
    }

    if (language !== "javascript") {
      setOutput(
        `⚠️ ${language.toUpperCase()} execution is not available yet.\n\n` +
          "Currently JavaScript execution is supported.\n" +
          "Python, C++, Java and other languages will be connected later."
      );

      return;
    }

    runJavaScript();
  };

  // =========================================================
  // CLEAR OUTPUT
  // =========================================================

  const clearOutput = () => {
    setOutput("");
  };

  // =========================================================
  // KEYBOARD SHORTCUTS
  // =========================================================

  const handleEditorKeyDown = (event) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "s"
    ) {
      event.preventDefault();

      console.log("Code saved locally.");
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "Enter"
    ) {
      event.preventDefault();

      runCode();
    }
  };

  // =========================================================
  // LANGUAGE LABEL
  // =========================================================

  const languageLabel = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    java: "Java",
    cpp: "C++",
    html: "HTML",
    css: "CSS",
    json: "JSON",
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      style={{
        width: "100%",
        marginTop: "20px",
        background: "#0b1120",
        border: "1px solid #1e293b",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "15px",
          padding: "14px 18px",
          background: "#111827",
          borderBottom: "1px solid #1f2937",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#1e293b",
              fontSize: "20px",
            }}
          >
            💻
          </div>

          <div>
            <div
              style={{
                color: "#f8fafc",
                fontWeight: "700",
                fontSize: "17px",
              }}
            >
              SyncSpace Code
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: "12px",
                marginTop: "2px",
              }}
            >
              Collaborative Code Editor
            </div>
          </div>
        </div>

        {/* CONNECTION + USERS */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 11px",
              borderRadius: "20px",
              background: yjsConnected
                ? "rgba(22,163,74,0.12)"
                : "rgba(220,38,38,0.12)",
              border: yjsConnected
                ? "1px solid rgba(34,197,94,0.25)"
                : "1px solid rgba(248,113,113,0.25)",
              color: yjsConnected
                ? "#4ade80"
                : "#f87171",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            <span>●</span>

            {yjsConnected
              ? `Yjs • Room ${joinedRoom}`
              : "Yjs disconnected"}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 11px",
              borderRadius: "20px",
              background: "#172033",
              border: "1px solid #263449",
              color: "#cbd5e1",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            👥 {onlineUsers.length} online
          </div>
        </div>
      </div>

      {/* ONLINE USERS */}

      {onlineUsers.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            background: "#0b1120",
            borderBottom: "1px solid #1e293b",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "#64748b",
              fontSize: "11px",
              fontWeight: "600",
            }}
          >
            COLLABORATORS
          </span>

          {onlineUsers.map((user) => (
            <div
              key={user.clientId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "14px",
                background: "#172033",
                border: "1px solid #263449",
                color: "#cbd5e1",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#22c55e",
                }}
              />

              {user.name || "Anonymous"}
            </div>
          ))}
        </div>
      )}

      {/* TOOLBAR */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          padding: "10px 14px",
          background: "#0f172a",
          borderBottom: "1px solid #1e293b",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setOutput("");
            }}
            style={{
              height: "34px",
              padding: "0 11px",
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid #334155",
              borderRadius: "6px",
              outline: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              height: "34px",
              padding: "0 12px",
              background: "#172033",
              border: "1px solid #263449",
              borderRadius: "6px",
              color: "#cbd5e1",
              fontSize: "13px",
            }}
          >
            📄

            <span>
              {language === "javascript"
                ? "main.js"
                : `main.${language}`}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={runCode}
            disabled={isRunning}
            style={{
              height: "34px",
              padding: "0 14px",
              background: isRunning
                ? "#334155"
                : "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: isRunning
                ? "not-allowed"
                : "pointer",
              fontWeight: "700",
              fontSize: "13px",
            }}
          >
            {isRunning
              ? "⏳ Running..."
              : "▶ Run"}
          </button>

          <button
            type="button"
            onClick={copyCode}
            style={{
              height: "34px",
              padding: "0 12px",
              background: "#1e293b",
              color: "#cbd5e1",
              border: "1px solid #334155",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>

          <button
            type="button"
            onClick={clearCode}
            style={{
              height: "34px",
              padding: "0 12px",
              background: "#1e293b",
              color: "#fca5a5",
              border: "1px solid #334155",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* MONACO */}

      <div
        style={{
          width: "100%",
          background: "#1e1e1e",
        }}
      >
        <Editor
          height="520px"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
          options={{
            fontSize: 15,

            fontFamily:
              "'JetBrains Mono', 'Fira Code', Consolas, monospace",

            lineHeight: 23,
            lineNumbers: "on",
            lineNumbersMinChars: 3,

            minimap: {
              enabled: true,
            },

            automaticLayout: true,
            wordWrap: "on",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            formatOnPaste: true,
            formatOnType: true,

            bracketPairColorization: {
              enabled: true,
            },

            guides: {
              bracketPairs: true,
              indentation: true,
            },

            scrollBeyondLastLine: false,
            folding: true,
            foldingHighlight: true,
            renderWhitespace: "selection",

            padding: {
              top: 12,
              bottom: 12,
            },

            tabSize: 2,
            insertSpaces: true,
            detectIndentation: true,
            overviewRulerBorder: false,

            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
          }}
          onKeyDown={handleEditorKeyDown}
        />
      </div>

      {/* TERMINAL */}

      <div
        style={{
          background: "#0f172a",
          borderTop: "1px solid #1e293b",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 15px",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
            }}
          >
            <span
              style={{
                color: "#f8fafc",
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              TERMINAL
            </span>

            <span
              style={{
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              OUTPUT
            </span>
          </div>

          <button
            type="button"
            onClick={clearOutput}
            style={{
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Clear
          </button>
        </div>

        <div
          style={{
            background: "#020617",
            minHeight: "120px",
            maxHeight: "260px",
            overflow: "auto",
          }}
        >
          <pre
            style={{
              margin: 0,
              padding: "16px",
              color: output.startsWith("❌")
                ? "#fca5a5"
                : output.startsWith("⚠️")
                ? "#fcd34d"
                : "#86efac",
              fontFamily:
                "'JetBrains Mono', Consolas, monospace",
              fontSize: "13px",
              lineHeight: "1.7",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {output ||
              "▶ Click Run or press Ctrl + Enter to execute your JavaScript code."}
          </pre>
        </div>
      </div>

      {/* STATUS */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "7px 14px",
          background: "#111827",
          borderTop: "1px solid #1f2937",
          color: "#64748b",
          fontSize: "11px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <span>
            Language:{" "}
            <strong style={{ color: "#cbd5e1" }}>
              {languageLabel[language] || language}
            </strong>
          </span>

          <span>
            Lines:{" "}
            <strong style={{ color: "#cbd5e1" }}>
              {(code || "").split("\n").length}
            </strong>
          </span>

          <span>
            Characters:{" "}
            <strong style={{ color: "#cbd5e1" }}>
              {(code || "").length}
            </strong>
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
          }}
        >
          <span>⌘/Ctrl + Enter Run</span>
          <span>⌘/Ctrl + S Save</span>
        </div>
      </div>
    </div>
  );
}

export default CodeEditor;