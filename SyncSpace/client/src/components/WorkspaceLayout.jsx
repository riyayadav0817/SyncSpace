import Sidebar from "./Sidebar";
import WorkspaceHeader from "./WorkspaceHeader";

function WorkspaceLayout({
  status,
  joinedRoom,
  participants,
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
        <Sidebar
          joinedRoom={joinedRoom}
          participants={participants}
        />

        <main
          style={{
            flex: 1,
            padding: "24px",
            overflow: "auto",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default WorkspaceLayout;