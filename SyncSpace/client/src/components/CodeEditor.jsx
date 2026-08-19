import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Editor from "@monaco-editor/react";

import {
  createRoomProvider,
} from "../collaboration/yjsProvider";

import {
  subscribeToAwareness,
} from "../collaboration/awareness";

const API_URL = "http://localhost:5000";

function CodeEditor({
  code,
  setCode,
  language,
  setLanguage,
  joinedRoom,
  userName,
}) {
  const editorRef = useRef(null);

  const providerRef = useRef(null);
  const yCodeRef = useRef(null);
  const ySettingsRef = useRef(null);

  const suppressCodeChangeRef = useRef(false);
  const suppressLanguageChangeRef = useRef(false);
  const initializingRef = useRef(false);

  const cursorDisposableRef = useRef(null);

  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [yjsConnected, setYjsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const [previewHtml, setPreviewHtml] = useState("");

  // =====================================================
  // CONNECT YJS
  // =====================================================

  useEffect(() => {
    if (!joinedRoom) {
      providerRef.current = null;
      yCodeRef.current = null;
      ySettingsRef.current = null;

      setYjsConnected(false);
      setOnlineUsers([]);

      return undefined;
    }

    let room = null;
    let unsubscribeAwareness = null;

    try {
      console.log(
        "💻 Connecting CodeEditor to room:",
        joinedRoom
      );

      room = createRoomProvider(joinedRoom, {
        name: userName?.trim() || "Anonymous",
      });

      const {
        provider,
        code: yCode,
        awareness,
        setUserName,
      } = room;

      providerRef.current = provider;
      yCodeRef.current = yCode;

      const ySettings =
        room.doc.getMap("code-settings");

      ySettingsRef.current = ySettings;

      setUserName(
        userName?.trim() || "Anonymous"
      );

      // ===================================================
      // STATUS
      // ===================================================

      const handleStatus = ({ status }) => {
        console.log(
          "🔌 Code Yjs status:",
          status
        );

        setYjsConnected(
          status === "connected"
        );
      };

      provider.on("status", handleStatus);

      // ===================================================
      // INITIAL SYNC
      // ===================================================

      const syncSharedState = () => {
        if (initializingRef.current) {
          return;
        }

        initializingRef.current = true;

        try {
          const sharedCode =
            yCode.toString();

          let sharedLanguage =
            ySettings.get("language");

          if (
            typeof sharedLanguage !==
              "string" ||
            !sharedLanguage
          ) {
            sharedLanguage =
              language || "javascript";

            ySettings.set(
              "language",
              sharedLanguage
            );
          }

          if (sharedCode.length > 0) {
            suppressCodeChangeRef.current =
              true;

            setCode(sharedCode);

            if (editorRef.current) {
              const currentValue =
                editorRef.current.getValue();

              if (
                currentValue !==
                sharedCode
              ) {
                editorRef.current.setValue(
                  sharedCode
                );
              }
            }

            suppressCodeChangeRef.current =
              false;
          } else if (
            typeof code === "string" &&
            code.length > 0
          ) {
            yCode.doc.transact(() => {
              yCode.insert(0, code);
            });
          }

          suppressLanguageChangeRef.current =
            true;

          setLanguage(sharedLanguage);

          suppressLanguageChangeRef.current =
            false;

          console.log(
            "🌐 Shared language:",
            sharedLanguage
          );
        } finally {
          initializingRef.current = false;
        }
      };

      const handleSync = (isSynced) => {
        console.log(
          "🔄 Code Yjs sync:",
          isSynced
        );

        if (!isSynced) {
          return;
        }

        setYjsConnected(true);

        syncSharedState();
      };

      provider.on("sync", handleSync);

      if (provider.synced) {
        syncSharedState();
      }

      // ===================================================
      // REMOTE CODE CHANGE
      // ===================================================

      const handleYjsCodeChange = () => {
        const remoteCode =
          yCode.toString();

        const editor =
          editorRef.current;

        suppressCodeChangeRef.current =
          true;

        setCode(remoteCode);

        if (
          editor &&
          editor.getValue() !==
            remoteCode
        ) {
          const position =
            editor.getPosition();

          editor.setValue(remoteCode);

          if (position) {
            try {
              editor.setPosition(
                position
              );
            } catch {
              // Ignore invalid cursor
            }
          }
        }

        suppressCodeChangeRef.current =
          false;
      };

      yCode.observe(
        handleYjsCodeChange
      );

      // ===================================================
      // REMOTE LANGUAGE CHANGE
      // ===================================================

      const handleYjsLanguageChange = (
        event
      ) => {
        const changed =
          event.keysChanged?.has(
            "language"
          );

        if (!changed) {
          return;
        }

        const remoteLanguage =
          ySettings.get("language");

        if (
          typeof remoteLanguage !==
            "string" ||
          !remoteLanguage
        ) {
          return;
        }

        suppressLanguageChangeRef.current =
          true;

        setLanguage(remoteLanguage);

        suppressLanguageChangeRef.current =
          false;
      };

      ySettings.observe(
        handleYjsLanguageChange
      );

      // ===================================================
      // AWARENESS
      // ===================================================

      const updateUsers = (users) => {
        setOnlineUsers(
          Array.isArray(users)
            ? users
            : []
        );
      };

      unsubscribeAwareness =
        subscribeToAwareness(
          awareness,
          updateUsers
        );

      // ===================================================
      // CLEANUP
      // ===================================================

      return () => {
        provider.off(
          "status",
          handleStatus
        );

        provider.off(
          "sync",
          handleSync
        );

        yCode.unobserve(
          handleYjsCodeChange
        );

        ySettings.unobserve(
          handleYjsLanguageChange
        );

        unsubscribeAwareness?.();

        cursorDisposableRef.current?.dispose();

        cursorDisposableRef.current =
          null;

        provider.destroy();
        room.doc.destroy();

        providerRef.current = null;
        yCodeRef.current = null;
        ySettingsRef.current = null;

        setYjsConnected(false);
        setOnlineUsers([]);

        initializingRef.current = false;
      };
    } catch (error) {
      console.error(
        "❌ Code Yjs connection failed:",
        error
      );

      setYjsConnected(false);
    }

    return undefined;
  }, [
    joinedRoom,
    userName,
    setCode,
    setLanguage,
  ]);

  // =====================================================
  // EDITOR MOUNT
  // =====================================================

  const handleEditorMount =
    useCallback(
      (editor) => {
        editorRef.current = editor;

        const yCode =
          yCodeRef.current;

        if (yCode) {
          const sharedCode =
            yCode.toString();

          if (
            sharedCode.length > 0
          ) {
            suppressCodeChangeRef.current =
              true;

            editor.setValue(
              sharedCode
            );

            setCode(sharedCode);

            suppressCodeChangeRef.current =
              false;
          }
        }

        const provider =
          providerRef.current;

        if (provider?.awareness) {
          cursorDisposableRef.current?.dispose();

          cursorDisposableRef.current =
            editor.onDidChangeCursorPosition(
              (event) => {
                provider.awareness.setLocalStateField(
                  "cursor",
                  {
                    lineNumber:
                      event.position
                        .lineNumber,

                    column:
                      event.position
                        .column,
                  }
                );
              }
            );
        }
      },
      [setCode]
    );

  // =====================================================
  // CODE CHANGE
  // =====================================================

  const handleCodeChange =
    useCallback(
      (value) => {
        const newCode =
          value ?? "";

        setCode(newCode);

        if (
          suppressCodeChangeRef.current
        ) {
          return;
        }

        const yCode =
          yCodeRef.current;

        if (!yCode) {
          return;
        }

        const oldCode =
          yCode.toString();

        if (oldCode === newCode) {
          return;
        }

        let start = 0;

        while (
          start < oldCode.length &&
          start < newCode.length &&
          oldCode[start] ===
            newCode[start]
        ) {
          start++;
        }

        let oldEnd =
          oldCode.length;

        let newEnd =
          newCode.length;

        while (
          oldEnd > start &&
          newEnd > start &&
          oldCode[oldEnd - 1] ===
            newCode[newEnd - 1]
        ) {
          oldEnd--;
          newEnd--;
        }

        const deleteLength =
          oldEnd - start;

        const insertedText =
          newCode.slice(
            start,
            newEnd
          );

        yCode.doc.transact(
          () => {
            if (
              deleteLength > 0
            ) {
              yCode.delete(
                start,
                deleteLength
              );
            }

            if (
              insertedText.length > 0
            ) {
              yCode.insert(
                start,
                insertedText
              );
            }
          }
        );
      },
      [setCode]
    );

  // =====================================================
  // LANGUAGE CHANGE
  // =====================================================

  const handleLanguageChange =
    useCallback(
      (newLanguage) => {
        setLanguage(
          newLanguage
        );

        setOutput("");
        setPreviewHtml("");

        if (
          suppressLanguageChangeRef.current
        ) {
          return;
        }

        const ySettings =
          ySettingsRef.current;

        if (!ySettings) {
          return;
        }

        const oldLanguage =
          ySettings.get(
            "language"
          );

        if (
          oldLanguage ===
          newLanguage
        ) {
          return;
        }

        ySettings.doc.transact(
          () => {
            ySettings.set(
              "language",
              newLanguage
            );
          }
        );
      },
      [setLanguage]
    );

  // =====================================================
  // COPY
  // =====================================================

  const copyCode =
    async () => {
      try {
        await navigator.clipboard.writeText(
          code || ""
        );

        setCopied(true);

        setTimeout(() => {
          setCopied(false);
        }, 1500);
      } catch (error) {
        console.error(
          "❌ Copy failed:",
          error
        );
      }
    };

  // =====================================================
  // CLEAR
  // =====================================================

  const clearCode = () => {
    if (
      !window.confirm(
        "Are you sure you want to clear the code?"
      )
    ) {
      return;
    }

    handleCodeChange("");

    setOutput("");
    setPreviewHtml("");
  };

  // =====================================================
  // FORMAT VALUE
  // =====================================================

  const formatValue =
    (value) => {
      if (
        typeof value ===
          "object" &&
        value !== null
      ) {
        try {
          return JSON.stringify(
            value,
            null,
            2
          );
        } catch {
          return String(value);
        }
      }

      return String(value);
    };

  // =====================================================
  // JAVASCRIPT
  // =====================================================

  const runJavaScript =
    () => {
      if (!code.trim()) {
        setOutput(
          "⚠️ No code to run."
        );

        return;
      }

      setIsRunning(true);
      setOutput("");

      const logs = [];

      const originalLog =
        console.log;

      const originalWarn =
        console.warn;

      const originalError =
        console.error;

      const originalInfo =
        console.info;

      try {
        console.log = (
          ...args
        ) => {
          logs.push(
            args
              .map(formatValue)
              .join(" ")
          );
        };

        console.warn = (
          ...args
        ) => {
          logs.push(
            `⚠️ ${args
              .map(formatValue)
              .join(" ")}`
          );
        };

        console.error = (
          ...args
        ) => {
          logs.push(
            `❌ ${args
              .map(formatValue)
              .join(" ")}`
          );
        };

        console.info = (
          ...args
        ) => {
          logs.push(
            `ℹ️ ${args
              .map(formatValue)
              .join(" ")}`
          );
        };

        const execute =
          new Function(code);

        const result =
          execute();

        if (
          result !== undefined
        ) {
          logs.push(
            formatValue(result)
          );
        }

        if (
          logs.length === 0
        ) {
          logs.push(
            "✅ Code executed successfully."
          );
        }

        setOutput(
          logs.join("\n")
        );
      } catch (error) {
        setOutput(
          `❌ ${error.name}: ${error.message}`
        );
      } finally {
        console.log =
          originalLog;

        console.warn =
          originalWarn;

        console.error =
          originalError;

        console.info =
          originalInfo;

        setIsRunning(false);
      }
    };

  // =====================================================
  // BACKEND CODE
  // Python / C / C++ / Java
  // =====================================================

  const runBackendCode =
    async () => {
      const response =
        await fetch(
          `${API_URL}/api/execute`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              language,
              code,
            }),
          }
        );

      const rawResponse =
        await response.text();

      let data;

      try {
        data =
          JSON.parse(
            rawResponse
          );
      } catch {
        throw new Error(
          `Server returned invalid JSON (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.output ||
            data?.message ||
            "Code execution failed."
        );
      }

      setOutput(
        data?.output ||
          "✅ Code executed successfully."
      );
    };

  // =====================================================
  // JSON
  // =====================================================

  const runJson = () => {
    if (!code.trim()) {
      setOutput(
        "⚠️ No JSON provided."
      );

      return;
    }

    try {
      const parsed =
        JSON.parse(code);

      setOutput(
        JSON.stringify(
          parsed,
          null,
          2
        )
      );
    } catch (error) {
      setOutput(
        `❌ JSON Error: ${error.message}`
      );
    }
  };

  // =====================================================
  // HTML
  // =====================================================

  const runHtml = () => {
    if (!code.trim()) {
      setPreviewHtml("");

      setOutput(
        "⚠️ No HTML provided."
      );

      return;
    }

    setPreviewHtml(code);

    setOutput(
      "✅ HTML preview updated."
    );
  };

  // =====================================================
  // RUN
  // =====================================================

  const runCode =
    async () => {
      if (!code.trim()) {
        setOutput(
          "⚠️ No code to run."
        );

        return;
      }

      setIsRunning(true);

      try {
        if (
          language ===
          "javascript"
        ) {
          runJavaScript();

          return;
        }

        if (
          language ===
          "json"
        ) {
          runJson();

          return;
        }

        if (
          language ===
          "html"
        ) {
          runHtml();

          return;
        }

        // Python
        // C
        // C++
        // Java
        await runBackendCode();
      } catch (error) {
        console.error(
          "❌ Execution error:",
          error
        );

        setOutput(
          `❌ ${error.message}`
        );
      } finally {
        setIsRunning(false);
      }
    };

  // =====================================================
  // KEYBOARD
  // =====================================================

  const handleEditorKeyDown =
    (event) => {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          "s"
      ) {
        event.preventDefault();
      }

      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key === "Enter"
      ) {
        event.preventDefault();

        runCode();
      }
    };

  // =====================================================
  // LANGUAGE LABEL
  // =====================================================

  const languageLabel = {
    javascript: "JavaScript",
    python: "Python",
    c: "C",
    cpp: "C++",
    java: "Java",
    html: "HTML",
    json: "JSON",
  };

  const showPreview =
    language === "html";

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      style={{
        width: "100%",
        marginTop: "20px",
        background: "#0b1120",
        border:
          "1px solid #1e293b",
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          padding: "14px 18px",
          background: "#111827",
          borderBottom:
            "1px solid #1f2937",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: "#f8fafc",
              fontWeight: 700,
              fontSize: "17px",
            }}
          >
            💻 SyncSpace Code
          </div>

          <div
            style={{
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            Collaborative Code
            Editor
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding:
                "7px 11px",
              borderRadius: "20px",
              background:
                yjsConnected
                  ? "rgba(22,163,74,.12)"
                  : "rgba(220,38,38,.12)",
              color:
                yjsConnected
                  ? "#4ade80"
                  : "#f87171",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            ●{" "}
            {yjsConnected
              ? "Yjs Connected"
              : "Yjs Disconnected"}
          </div>

          <div
            style={{
              padding:
                "7px 11px",
              borderRadius: "20px",
              background:
                "#172033",
              color: "#cbd5e1",
              fontSize: "12px",
            }}
          >
            👥{" "}
            {onlineUsers.length}{" "}
            online
          </div>
        </div>
      </div>

      {/* TOOLBAR */}

      <div
        style={{
          padding:
            "10px 14px",
          background: "#0f172a",
          borderBottom:
            "1px solid #1e293b",
          display: "flex",
          justifyContent:
            "space-between",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <select
          value={language}
          onChange={(event) =>
            handleLanguageChange(
              event.target.value
            )
          }
          style={{
            height: "34px",
            padding:
              "0 11px",
            background:
              "#1e293b",
            color:
              "#e2e8f0",
            border:
              "1px solid #334155",
            borderRadius:
              "6px",
          }}
        >
          <option value="javascript">
            JavaScript
          </option>

          <option value="python">
            Python
          </option>

          <option value="c">
            C
          </option>

          <option value="cpp">
            C++
          </option>

          <option value="java">
            Java
          </option>

          <option value="html">
            HTML
          </option>

          <option value="json">
            JSON
          </option>
        </select>

        <div
          style={{
            display: "flex",
            gap: "7px",
          }}
        >
          <button
            type="button"
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning
              ? "⏳ Running..."
              : "▶ Run"}
          </button>

          <button
            type="button"
            onClick={copyCode}
          >
            {copied
              ? "✓ Copied"
              : "📋 Copy"}
          </button>

          <button
            type="button"
            onClick={clearCode}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* EDITOR */}

      <Editor
        height="520px"
        language={language}
        theme="vs-dark"
        defaultValue=""
        onChange={
          handleCodeChange
        }
        onMount={
          handleEditorMount
        }
        options={{
          fontSize: 15,
          automaticLayout: true,

          minimap: {
            enabled: true,
          },

          wordWrap: "on",
          smoothScrolling: true,
          cursorBlinking:
            "smooth",

          bracketPairColorization:
            {
              enabled: true,
            },

          tabSize: 2,
          insertSpaces: true,

          padding: {
            top: 10,
            bottom: 10,
          },

          scrollBeyondLastLine:
            false,

          renderWhitespace:
            "selection",
        }}
        onKeyDown={
          handleEditorKeyDown
        }
      />

      {/* HTML PREVIEW */}

      {showPreview && (
        <div
          style={{
            background:
              "#ffffff",
            borderTop:
              "1px solid #1e293b",
          }}
        >
          <div
            style={{
              padding:
                "10px 14px",
              background:
                "#111827",
              color:
                "#cbd5e1",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            🌐 HTML PREVIEW
          </div>

          <iframe
            title="SyncSpace HTML Preview"
            sandbox=""
            srcDoc={previewHtml}
            style={{
              display:
                "block",
              width: "100%",
              height: "320px",
              border: "none",
              background:
                "#fff",
            }}
          />
        </div>
      )}

      {/* OUTPUT */}

      <div
        style={{
          background:
            "#020617",
          minHeight:
            "120px",
          padding: "16px",
        }}
      >
        <div
          style={{
            color:
              "#64748b",
            fontSize:
              "12px",
            marginBottom:
              "8px",
          }}
        >
          OUTPUT
        </div>

        <pre
          style={{
            margin: 0,
            color:
              "#86efac",
            whiteSpace:
              "pre-wrap",
            fontFamily:
              "monospace",
          }}
        >
          {output ||
            "▶ Click Run or press Ctrl + Enter"}
        </pre>
      </div>

      {/* FOOTER */}

      <div
        style={{
          padding:
            "7px 14px",
          background:
            "#111827",
          color:
            "#64748b",
          fontSize:
            "11px",
        }}
      >
        Language:{" "}
        <strong>
          {languageLabel[
            language
          ] || language}
        </strong>{" "}
        • Lines:{" "}
        {(code || "")
          .split("\n")
          .length}{" "}
        • Characters:{" "}
        {(code || "").length}
      </div>
    </div>
  );
}

export default CodeEditor;