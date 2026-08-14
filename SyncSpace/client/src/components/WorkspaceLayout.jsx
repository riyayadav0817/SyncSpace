import WorkspaceHeader from "./WorkspaceHeader";

function WorkspaceLayout({
  status,
  joinedRoom,
  participants,
  sidebar,
  roomPanel,
  children,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <WorkspaceHeader
        status={status}
        joinedRoom={joinedRoom}
        participants={participants}
      />

      <div
        style={{
          display: "flex",
          minHeight: "calc(100vh - 70px)",
        }}
      >
        {/* SIDEBAR */}
        <aside
          style={{
            width: "240px",
            flexShrink: 0,
            background: "#111827",
            borderRight: "1px solid #1f2937",
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          {sidebar}
        </aside>

        {/* MAIN */}
        <main
          style={{
            flex: 1,
            padding: "24px",
            overflow: "auto",
            boxSizing: "border-box",
          }}
        >
          {/* ROOM PANEL */}
          {roomPanel}

          {/* ACTIVE PAGE */}
          {children}
        </main>
      </div>
    </div>
  );
}

export default WorkspaceLayout;