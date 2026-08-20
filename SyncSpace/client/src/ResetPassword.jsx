
import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";
  
function ResetPassword() {
  const params = new URLSearchParams(
    window.location.search
  );

  const token = params.get("token") || "";
  const email = params.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!token || !email) {
      setError(
        "This password reset link is invalid or incomplete."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            token,
            password,
          }),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "Server returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Password reset failed."
        );
      }

      setMessage(
        "Password reset successful. You can now sign in."
      );

      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(
        "❌ Reset password error:",
        error
      );

      if (
        error instanceof TypeError &&
        error.message === "Failed to fetch"
      ) {
        setError(
          "Cannot connect to SyncSpace server. Make sure the backend is running on port 5000."
        );
      } else {
        setError(
          error.message ||
            "Unable to reset password."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-glow glow-one"></div>
        <div className="auth-glow glow-two"></div>
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            S
          </div>

          <span>SyncSpace</span>
        </div>

        <div className="auth-heading">
          <h1>Reset password</h1>

          <p>
            Enter a new password for your
            SyncSpace account.
          </p>
        </div>

        {error && (
          <div className="auth-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="auth-success">
            <span>✅</span>
            <span>{message}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          <div className="auth-field">
            <label htmlFor="new-password">
              New password
            </label>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                🔒
              </span>

              <input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                disabled={loading}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="confirm-password">
              Confirm password
            </label>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                🔒
              </span>

              <input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                disabled={loading}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Resetting..."
              : "Reset Password →"}
          </button>
        </form>

        <div className="auth-divider">
          <span>
            Secure workspace access
          </span>
        </div>

        <div className="auth-register">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            ← Back to sign in
          </button>
        </div>

        <div className="auth-footer">
          <span>🔐</span>

          <span>
            Your workspace is protected
            with secure authentication.
          </span>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;

