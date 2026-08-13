import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./JoinWorkspace.css";

function JoinWorkspace() {
  const navigate = useNavigate();

  const savedUser = localStorage.getItem("syncspaceUser");

  const user = savedUser
    ? JSON.parse(savedUser)
    : null;

  const [name, setName] = useState(user?.name || "");
  const [roomId, setRoomId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedRoomId = roomId.trim();

    if (!trimmedName) {
      alert("Please enter your name");
      return;
    }

    if (!trimmedRoomId) {
      alert("Please enter Room ID");
      return;
    }

    // Save workspace information
    localStorage.setItem(
      "syncspaceName",
      trimmedName
    );

    localStorage.setItem(
      "syncspaceRoom",
      trimmedRoomId
    );

    // Go to workspace
    navigate("/workspace");
  };

  const handleLogout = () => {
    localStorage.removeItem("syncspaceLoggedIn");
    localStorage.removeItem("syncspaceName");
    localStorage.removeItem("syncspaceRoom");

    navigate("/login");
  };

  return (
    <div className="join-page">

      {/* Background decoration */}
      <div className="join-orb join-orb-one"></div>
      <div className="join-orb join-orb-two"></div>
      <div className="join-orb join-orb-three"></div>

      <form
        onSubmit={handleSubmit}
        className="join-card"
      >

        {/* Logo */}
        <div className="join-logo">
          🚀
        </div>

        <div className="join-brand">
          SYNCSPACE
        </div>

        <h1>
          Join Workspace
        </h1>

        <p className="join-subtitle">
          Welcome back,{" "}
          <strong>
            {user?.name || "Collaborator"}
          </strong>
          <br />
          Enter your workspace details to continue.
        </p>

        {/* NAME */}
        <div className="join-field">
          <label htmlFor="join-name">
            👤 Your Name
          </label>

          <div className="join-input-wrapper">
            <span>👤</span>

            <input
              id="join-name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              autoComplete="name"
            />
          </div>
        </div>

        {/* ROOM ID */}
        <div className="join-field">
          <label htmlFor="join-room">
            📁 Room ID
          </label>

          <div className="join-input-wrapper room-input">
            <span>🔑</span>

            <input
              id="join-room"
              type="text"
              placeholder="Example: 1234"
              value={roomId}
              onChange={(e) =>
                setRoomId(e.target.value)
              }
              autoComplete="off"
            />
          </div>
        </div>

        {/* BUTTON */}
        <button
          type="submit"
          className="join-button"
        >
          <span>
            Enter SyncSpace
          </span>

          <span className="join-arrow">
            →
          </span>
        </button>

        {/* Info */}
        <div className="join-info">
          <span>●</span>
          Real-time collaboration
        </div>

        <div className="join-divider">
          <span></span>
          <p>WORKSPACE</p>
          <span></span>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="join-logout"
        >
          ← Logout
        </button>

      </form>
    </div>
  );
}

export default JoinWorkspace;