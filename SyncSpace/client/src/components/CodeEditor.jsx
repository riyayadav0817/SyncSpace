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

function CodeEditor({
  code,
  setCode,
  language,
  setLanguage,
  joinedRoom,
  userName,
}) {
  const editorRef =
    useRef(null);

  const providerRef =
    useRef(null);

  const yCodeRef =
    useRef(null);

  const suppressChangeRef =
    useRef(false);

  const [copied, setCopied] =
    useState(false);

  const [output, setOutput] =
    useState("");

  const [isRunning, setIsRunning] =
    useState(false);

  const [yjsConnected, setYjsConnected] =
    useState(false);

  const [onlineUsers, setOnlineUsers] =
    useState([]);

  // =====================================================
  // CONNECT YJS
  // =====================================================

  useEffect(() => {
    if (!joinedRoom) {
      providerRef.current = null;
      yCodeRef.current = null;

      setYjsConnected(false);
      setOnlineUsers([]);

      return;
    }

    let room = null;
    let unsubscribeAwareness = null;

    try {
      room =
        createRoomProvider(
          joinedRoom,
          {
            name:
              userName ||
              "Anonymous",
          },
        );

      const {
        provider,
        code: yCode,
        awareness,
        setUserName,
        setCursorState,
      } = room;

      providerRef.current =
        provider;

      yCodeRef.current =
        yCode;

      setUserName(userName);

      // ===================================================
      // STATUS
      // ===================================================

      const handleStatus = ({
        status,
      }) => {
        console.log(
          "Yjs status:",
          status,
        );

        setYjsConnected(
          status ===
            "connected",
        );
      };

      provider.on(
        "status",
        handleStatus,
      );

      // ===================================================
      // SYNC EVENT
      // ===================================================

      const handleSync = (
        isSynced,
      ) => {
        console.log(
          "Yjs synced:",
          isSynced,
        );

        if (isSynced) {
          setYjsConnected(true);
        }
      };

      provider.on(
        "sync",
        handleSync,
      );

      // ===================================================
      // REMOTE CODE CHANGE
      // ===================================================

      const handleYjsChange = () => {
        const newCode =
          yCode.toString();

        const editor =
          editorRef.current;

        if (
          editor &&
          editor.getValue() ===
            newCode
        ) {
          return;
        }

        suppressChangeRef.current =
          true;

        setCode(newCode);

        if (editor) {
          const model =
            editor.getModel();

          if (model) {
            model.setValue(
              newCode,
            );
          }
        }

        suppressChangeRef.current =
          false;
      };

      yCode.observe(
        handleYjsChange,
      );

      // ===================================================
      // INITIAL CODE
      // ===================================================

      const initialCode =
        yCode.toString();

      if (
        initialCode !==
        code
      ) {
        suppressChangeRef.current =
          true;

        setCode(initialCode);

        if (
          editorRef.current
        ) {
          editorRef.current.setValue(
            initialCode,
          );
        }

        suppressChangeRef.current =
          false;
      }

      // ===================================================
      // AWARENESS
      // ===================================================

      const updateUsers =
        (users) => {
          setOnlineUsers(
            users,
          );
        };

      unsubscribeAwareness =
        subscribeToAwareness(
          awareness,
          updateUsers,
        );

      // ===================================================
      // CURSOR
      // ===================================================

      if (
        editorRef.current
      ) {
        const disposable =
          editorRef.current.onDidChangeCursorPosition(
            (event) => {
              setCursorState({
                lineNumber:
                  event.position
                    .lineNumber,

                column:
                  event.position
                    .column,
              });
            },
          );

        return () => {
          disposable.dispose();
        };
      }

      // ===================================================
      // CLEANUP
      // ===================================================

      return () => {
        provider.off(
          "status",
          handleStatus,
        );

        provider.off(
          "sync",
          handleSync,
        );

        yCode.unobserve(
          handleYjsChange,
        );

        unsubscribeAwareness?.();

        provider.destroy();

        room.doc.destroy();

        providerRef.current =
          null;

        yCodeRef.current =
          null;

        setYjsConnected(false);
        setOnlineUsers([]);
      };
    } catch (error) {
      console.error(
        "Yjs connection failed:",
        error,
      );

      setYjsConnected(false);
    }
  }, [
    joinedRoom,
    userName,
    setCode,
  ]);

  // =====================================================
  // EDITOR MOUNT
  // =====================================================

  const handleEditorMount =
    useCallback(
      (editor) => {
        editorRef.current =
          editor;

        const yCode =
          yCodeRef.current;

        if (yCode) {
          const value =
            yCode.toString();

          suppressChangeRef.current =
            true;

          editor.setValue(
            value,
          );

          setCode(value);

          suppressChangeRef.current =
            false;
        }

        // Cursor awareness
        const provider =
          providerRef.current;

        if (
          provider?.awareness
        ) {
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
                },
              );
            },
          );
        }
      },
      [setCode],
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
          suppressChangeRef.current
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

        if (
          oldCode ===
          newCode
        ) {
          return;
        }

        // ===============================================
        // FIND CHANGE
        // ===============================================

        let start = 0;

        while (
          start <
            oldCode.length &&
          start <
            newCode.length &&
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
          oldCode[
            oldEnd - 1
          ] ===
            newCode[
              newEnd - 1
            ]
        ) {
          oldEnd--;
          newEnd--;
        }

        const deleteLength =
          oldEnd - start;

        const insertedText =
          newCode.slice(
            start,
            newEnd,
          );

        yCode.doc.transact(
          () => {
            if (
              deleteLength >
              0
            ) {
              yCode.delete(
                start,
                deleteLength,
              );
            }

            if (
              insertedText
                .length >
              0
            ) {
              yCode.insert(
                start,
                insertedText,
              );
            }
          },
        );
      },
      [setCode],
    );

  // =====================================================
  // COPY
  // =====================================================

  const copyCode =
    async () => {
      try {
        await navigator.clipboard.writeText(
          code || "",
        );

        setCopied(true);

        setTimeout(
          () =>
            setCopied(false),
          1500,
        );
      } catch (error) {
        console.error(
          "Copy failed:",
          error,
        );
      }
    };

  // =====================================================
  // CLEAR
  // =====================================================

  const clearCode = () => {
    if (
      !window.confirm(
        "Are you sure you want to clear the code?",
      )
    ) {
      return;
    }

    handleCodeChange("");

    setOutput("");
  };

  // =====================================================
  // FORMAT
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
            2,
          );
        } catch {
          return String(
            value,
          );
        }
      }

      return String(value);
    };

  // =====================================================
  // RUN JS
  // =====================================================

  const runJavaScript =
    () => {
      if (!code.trim()) {
        setOutput(
          "⚠️ No code to run.",
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
              .map(
                formatValue,
              )
              .join(" "),
          );
        };

        console.warn = (
          ...args
        ) => {
          logs.push(
            `⚠️ ${args
              .map(
                formatValue,
              )
              .join(" ")}`,
          );
        };

        console.error = (
          ...args
        ) => {
          logs.push(
            `❌ ${args
              .map(
                formatValue,
              )
              .join(" ")}`,
          );
        };

        console.info = (
          ...args
        ) => {
          logs.push(
            `ℹ️ ${args
              .map(
                formatValue,
              )
              .join(" ")}`,
          );
        };

        const execute =
          new Function(
            code,
          );

        const result =
          execute();

        if (
          result !==
          undefined
        ) {
          logs.push(
            formatValue(
              result,
            ),
          );
        }

        if (
          logs.length ===
          0
        ) {
          logs.push(
            "✅ Code executed successfully.",
          );
        }

        setOutput(
          logs.join("\n"),
        );
      } catch (error) {
        setOutput(
          `❌ ${error.name}: ${error.message}`,
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
  // RUN
  // =====================================================

  const runCode = () => {
    if (
      language !==
      "javascript"
    ) {
      setOutput(
        `⚠️ ${language.toUpperCase()} execution is not available yet.`,
      );

      return;
    }

    runJavaScript();
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

  const languageLabel = {
    javascript:
      "JavaScript",

    typescript:
      "TypeScript",

    python:
      "Python",

    java: "Java",

    cpp: "C++",

    html: "HTML",

    css: "CSS",

    json: "JSON",
  };

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
      <div
        style={{
          padding:
            "14px 18px",
          background:
            "#111827",
          borderBottom:
            "1px solid #1f2937",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          gap: "12px",
          flexWrap:
            "wrap",
        }}
      >
        <div>
          <div
            style={{
              color:
                "#f8fafc",
              fontWeight:
                "700",
              fontSize:
                "17px",
            }}
          >
            💻 SyncSpace Code
          </div>

          <div
            style={{
              color:
                "#64748b",
              fontSize:
                "12px",
            }}
          >
            Collaborative Code Editor
          </div>
        </div>

        <div
          style={{
            display:
              "flex",
            gap: "8px",
            flexWrap:
              "wrap",
          }}
        >
          <div
            style={{
              padding:
                "7px 11px",
              borderRadius:
                "20px",
              background:
                yjsConnected
                  ? "rgba(22,163,74,.12)"
                  : "rgba(220,38,38,.12)",
              color:
                yjsConnected
                  ? "#4ade80"
                  : "#f87171",
              fontSize:
                "12px",
              fontWeight:
                "600",
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
              borderRadius:
                "20px",
              background:
                "#172033",
              color:
                "#cbd5e1",
              fontSize:
                "12px",
            }}
          >
            👥{" "}
            {
              onlineUsers.length
            }{" "}
            online
          </div>
        </div>
      </div>

      <div
        style={{
          padding:
            "10px 14px",
          background:
            "#0f172a",
          borderBottom:
            "1px solid #1e293b",
          display:
            "flex",
          justifyContent:
            "space-between",
          gap: "10px",
          flexWrap:
            "wrap",
        }}
      >
        <select
          value={
            language
          }
          onChange={(e) => {
            setLanguage(
              e.target.value,
            );
          }}
          style={{
            height:
              "34px",
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

        <div
          style={{
            display:
              "flex",
            gap: "7px",
          }}
        >
          <button
            type="button"
            onClick={
              runCode
            }
            disabled={
              isRunning
            }
          >
            {isRunning
              ? "⏳ Running..."
              : "▶ Run"}
          </button>

          <button
            type="button"
            onClick={
              copyCode
            }
          >
            {copied
              ? "✓ Copied"
              : "📋 Copy"}
          </button>

          <button
            type="button"
            onClick={
              clearCode
            }
          >
            🗑 Clear
          </button>
        </div>
      </div>

      <Editor
        height="520px"
        language={
          language
        }
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

          automaticLayout:
            true,

          minimap: {
            enabled:
              true,
          },

          wordWrap: "on",

          smoothScrolling:
            true,

          cursorBlinking:
            "smooth",

          bracketPairColorization:
            {
              enabled:
                true,
            },

          tabSize: 2,

          insertSpaces:
            true,
        }}
        onKeyDown={
          handleEditorKeyDown
        }
      />

      <div
        style={{
          background:
            "#020617",
          minHeight:
            "120px",
          padding:
            "16px",
        }}
      >
        <pre
          style={{
            margin: 0,
            color:
              "#86efac",
            whiteSpace:
              "pre-wrap",
          }}
        >
          {output ||
            "▶ Click Run or press Ctrl + Enter"}
        </pre>
      </div>

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
          ] ||
            language}
        </strong>{" "}
        • Lines:{" "}
        {
          (code || "")
            .split("\n")
            .length
        }{" "}
        • Characters:{" "}
        {(code || "").length}
      </div>
    </div>
  );
}

export default CodeEditor;
