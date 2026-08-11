
import Editor from "@monaco-editor/react";

function CodeEditor({
  code,
  setCode,
  language,
  setLanguage,
  joinedRoom,
  socket,
}) {
  const handleCodeChange = (value) => {
    const newCode = value || "";

    setCode(newCode);

    if (joinedRoom) {
      socket.emit("code-change", {
        roomId: joinedRoom,
        code: newCode,
      });
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
          marginBottom: "15px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <h2>💻 Code Editor</h2>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
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
      </div>

      {/* Monaco Editor */}

      <Editor
        height="500px"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={handleCodeChange}
        options={{
          fontSize: 15,
          minimap: {
            enabled: false,
          },
          automaticLayout: true,
          wordWrap: "on",
        }}
      />
    </div>
  );
}

export default CodeEditor;
