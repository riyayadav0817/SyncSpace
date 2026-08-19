
import WorkspaceHeader from "./WorkspaceHeader";

function WorkspaceLayout({
  status,
  joinedRoom,
  participants,
  sidebar,
  roomPanel,
  children,
  onLeave,
}) {
  return (
    <div className="workspace-shell">
      <WorkspaceHeader
        status={status}
        joinedRoom={joinedRoom}
        participants={participants}
        onLeave={onLeave}
      />

      <div className="workspace-body">
        {/* SIDEBAR */}
        <aside className="workspace-sidebar">
          {sidebar}
        </aside>

        {/* MAIN CONTENT */}
        <main className="workspace-content">
          {/* ROOM PANEL */}
          {roomPanel}

          {/* ACTIVE SECTION */}
          <section className="workspace-section">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}

export default WorkspaceLayout;

