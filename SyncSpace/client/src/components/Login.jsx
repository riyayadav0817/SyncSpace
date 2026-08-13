
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      alert("Please enter email and password");
      return;
    }

    const savedUser = localStorage.getItem("syncspaceUser");

    if (!savedUser) {
      alert("No account found. Please register first.");
      navigate("/register");
      return;
    }

    const user = JSON.parse(savedUser);

    if (
      email.trim().toLowerCase() !==
        user.email.toLowerCase() ||
      password !== user.password
    ) {
      alert("Invalid email or password");
      return;
    }

    localStorage.setItem("syncspaceLoggedIn", "true");

    // IMPORTANT
    navigate("/join-workspace");
  };

  return (
    <div className="login-page">
      <div className="login-background-shape login-shape-one"></div>
      <div className="login-background-shape login-shape-two"></div>

      <form onSubmit={handleSubmit} className="login-card">
        <div className="login-logo">🚀</div>

        <div className="login-brand">SyncSpace</div>

        <h1>Welcome Back</h1>

        <p className="login-subtitle">
          Login to continue to your
          <br />
          collaborative workspace.
        </p>

        <div className="login-field">
          <label htmlFor="login-email">
            Email Address
          </label>

          <div className="login-input-wrapper">
            <span>✉️</span>

            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
            />
          </div>
        </div>

        <div className="login-field">
          <label htmlFor="login-password">
            Password
          </label>

          <div className="login-input-wrapper">
            <span>🔒</span>

            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="current-password"
            />
          </div>
        </div>

        <button
          type="submit"
          className="login-button"
        >
          <span>Login to SyncSpace</span>
          <span className="login-arrow">→</span>
        </button>

        <div className="login-divider">
          <span></span>
          <p>OR</p>
          <span></span>
        </div>

        <p className="login-footer">
          Don't have an account?

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="login-register-link"
          >
            Create Account
          </button>
        </p>

        <div className="login-security">
          🔐 Secure & collaborative
        </div>
      </form>
    </div>
  );
}

export default Login;

