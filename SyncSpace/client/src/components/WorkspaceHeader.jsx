function WorkspaceHeader({
  status,
  joinedRoom,
  participants,
  onLeave,
}) {
  const isConnected = status?.includes("Connected");

  return (
    <header className="workspace-header">
      {/* LEFT */}
      <div className="workspace-header-left">
        <div className="workspace-header-brand">
          <div className="workspace-header-logo">
            🎨
          </div>

          <div>
            <div className="workspace-header-title">
              {joinedRoom
                ? `Workspace ${joinedRoom}`
                : "SyncSpace Workspace"}
            </div>

            <div
              className={`workspace-header-status ${
                isConnected
                  ? "workspace-status-connected"
                  : "workspace-status-warning"
              }`}
            >
              <span className="workspace-status-dot">
                ●
              </span>

              {status || "Disconnected"}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="workspace-header-right">
        <div className="workspace-online">
          <span className="workspace-online-icon">
            👥
          </span>

          <span>
            {participants?.length || 0} online
          </span>
        </div>

        <button
          type="button"
          className="workspace-header-leave"
          onClick={onLeave}
        >
          Leave
        </button>
      </div>
    </header>
  );
}

export default WorkspaceHeader;