import { useState } from "react";
import "./auth.css";

function Register({
  onRegister,
  onSwitch,
}) {
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const cleanName =
      name.trim();

    const cleanEmail =
      email.trim();

    if (
      !cleanName ||
      !cleanEmail ||
      !password
    ) {
      setError(
        "Please fill in all fields."
      );
      return;
    }

    if (cleanName.length < 2) {
      setError(
        "Name must be at least 2 characters."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "https://syncspace-8lew.onrender.com/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Registration failed."
        );
      }

      /* Save token */
      localStorage.setItem(
        "syncspaceToken",
        data.token
      );

      /* Save user */
      localStorage.setItem(
        "syncspaceUser",
        JSON.stringify({
          id:
            data.user?._id ||
            data.user?.id ||
            "",
          name:
            data.user?.name ||
            cleanName,
          email:
            data.user?.email ||
            cleanEmail,
        })
      );

      console.log(
        "✅ Registration successful"
      );

      if (onRegister) {
        onRegister(data);
      }
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      setError(
        error.message ||
          "Unable to create account."
      );
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
            Create your account
          </h1>

          <p>
            Join SyncSpace and start
            collaborating with your
            team.
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
          {/* Name */}
          <div className="auth-field">
            <label htmlFor="register-name">
              Full name
            </label>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                👤
              </span>

              <input
                id="register-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                autoComplete="name"
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div className="auth-field">
            <label htmlFor="register-email">
              Email address
            </label>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                ✉
              </span>

              <input
                id="register-email"
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
            <label htmlFor="register-password">
              Password
            </label>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                🔒
              </span>

              <input
                id="register-password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
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
                  Creating account...
                </span>
              </>
            ) : (
              <>
                <span>
                  Create account
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

        {/* Login */}
        <div className="auth-register">
          <span>
            Already have an account?
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
            Sign in
          </button>
        </div>

        {/* Footer */}
        <div className="auth-footer">
          <span>🔐</span>

          <span>
            Your account is protected
            with secure authentication.
          </span>
        </div>
      </div>
    </div>
  );
}

export default Register;