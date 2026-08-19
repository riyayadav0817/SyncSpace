import { useState } from "react";
import "./auth.css";
function Login({ onLogin, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");

  const [error, setError] = useState("");

  /* =====================================================
     LOGIN
  ===================================================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setForgotSuccess("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError(
        "Please enter your email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "https://syncspace-8lew.onrender.com/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Invalid email or password."
        );
      }

      localStorage.setItem(
        "syncspaceToken",
        data.token
      );

      localStorage.setItem(
        "syncspaceUser",
        JSON.stringify({
          id:
            data.user?._id ||
            data.user?.id ||
            "",
          name:
            data.user?.name ||
            "",
          email:
            data.user?.email ||
            cleanEmail,
        })
      );

      console.log("✅ Login successful");

      if (onLogin) {
        onLogin(data);
      }
    } catch (error) {
      console.error("Login error:", error);

      setError(
        error.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     FORGOT PASSWORD
  ===================================================== */

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    setError("");
    setForgotSuccess("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    try {
      setForgotLoading(true);

      const response = await fetch(
        "https://syncspace-8lew.onrender.com/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: cleanEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to send reset email."
        );
      }

      setForgotSuccess(
        "If an account exists with this email, a password reset link has been sent."
      );
    } catch (error) {
      console.error(
        "Forgot password error:",
        error
      );

      setError(
        error.message ||
          "Unable to send reset email."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  /* =====================================================
     FORGOT PASSWORD SCREEN
  ===================================================== */

  if (forgotMode) {
    return (
      <div className="auth-page">
        <div className="auth-background">
          <div className="auth-glow glow-one"></div>
          <div className="auth-glow glow-two"></div>
        </div>

        <div className="auth-card">

          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">
              S
            </div>

            <span>
              SyncSpace
            </span>
          </div>

          {/* Heading */}
          <div className="auth-heading">
            <h1>
              Forgot password?
            </h1>

            <p>
              Enter your email and
              we'll send you a
              password reset link.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-error">
              <span>⚠️</span>

              <span>
                {error}
              </span>
            </div>
          )}

          {/* Success */}
          {forgotSuccess && (
            <div className="auth-success">
              <span>✓</span>

              <span>
                {forgotSuccess}
              </span>
            </div>
          )}

          {/* Forgot Form */}
          <form
            onSubmit={handleForgotPassword}
            className="auth-form"
          >
            <div className="auth-field">
              <label htmlFor="forgot-email">
                Email address
              </label>

              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  ✉
                </span>

                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  autoComplete="email"
                  disabled={forgotLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <>
                  <span className="auth-spinner"></span>

                  <span>
                    Sending...
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Send reset link
                  </span>

                  <span className="auth-submit-arrow">
                    →
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Back */}
          <div className="auth-register">
            <button
              type="button"
              disabled={forgotLoading}
              onClick={() => {
                setForgotMode(false);
                setError("");
                setForgotSuccess("");
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

  /* =====================================================
     LOGIN SCREEN
  ===================================================== */

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-glow glow-one"></div>
        <div className="auth-glow glow-two"></div>
      </div>

      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            S
          </div>

          <span>
            SyncSpace
          </span>
        </div>

        {/* Heading */}
        <div className="auth-heading">
          <h1>
            Welcome back
          </h1>

          <p>
            Sign in to continue to
            your collaborative
            workspace.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-error">
            <span>⚠️</span>

            <span>
              {error}
            </span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          {/* Email */}
          <div className="auth-field">
            <label htmlFor="login-email">
              Email address
            </label>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                ✉
              </span>

              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="login-password">
              Password
            </label>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                🔒
              </span>

              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          {/* Forgot Password */}
          <div
            style={{
              textAlign: "right",
              marginTop: "-8px",
              marginBottom: "8px",
            }}
          >
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setForgotMode(true);
                setError("");
                setForgotSuccess("");
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: "14px",
                color: "#2563eb",
              }}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="auth-spinner"></span>

                <span>
                  Signing in...
                </span>
              </>
            ) : (
              <>
                <span>
                  Sign in
                </span>

                <span className="auth-submit-arrow">
                  →
                </span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>
            Secure workspace access
          </span>
        </div>

        {/* Register */}
        <div className="auth-register">
          <span>
            Don't have an account?
          </span>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setError("");

              if (onSwitch) {
                onSwitch();
              }
            }}
          >
            Create an account
          </button>
        </div>

        {/* Footer */}
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

export default Login;