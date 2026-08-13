
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";

function Register({ onRegister }) {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const user = {
      name: name.trim(),
      email: email.trim(),
      password,
    };

    // Save user locally
    localStorage.setItem(
      "syncspaceUser",
      JSON.stringify(user)
    );

    // Parent callback if provided
    if (onRegister) {
      onRegister(user);
    }

    alert("Registration successful! 🎉");

    // Go to Login
    navigate("/login");
  };

  const goToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="register-page">

      {/* BACKGROUND DECORATION */}

      <div className="register-orb register-orb-one"></div>
      <div className="register-orb register-orb-two"></div>
      <div className="register-orb register-orb-three"></div>

      {/* REGISTER CARD */}

      <form
        onSubmit={handleSubmit}
        className="register-card"
      >

        {/* LOGO */}

        <div className="register-logo">
          🚀
        </div>

        <div className="register-brand">
          SyncSpace
        </div>

        {/* TITLE */}

        <h1>Create Account</h1>

        <p className="register-subtitle">
          Create your account and start
          <br />
          collaborating with your team.
        </p>

        {/* NAME */}

        <div className="register-field">
          <label htmlFor="register-name">
            Full Name
          </label>

          <div className="register-input-wrapper">
            <span>👤</span>

            <input
              id="register-name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              autoComplete="name"
            />
          </div>
        </div>

        {/* EMAIL */}

        <div className="register-field">
          <label htmlFor="register-email">
            Email Address
          </label>

          <div className="register-input-wrapper">
            <span>✉️</span>

            <input
              id="register-email"
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

        {/* PASSWORD */}

        <div className="register-field">
          <label htmlFor="register-password">
            Password
          </label>

          <div className="register-input-wrapper">
            <span>🔒</span>

            <input
              id="register-password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* CONFIRM PASSWORD */}

        <div className="register-field">
          <label htmlFor="register-confirm">
            Confirm Password
          </label>

          <div className="register-input-wrapper">
            <span>🔐</span>

            <input
              id="register-confirm"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* REGISTER BUTTON */}

        <button
          type="submit"
          className="register-button"
        >
          <span>Create My Account</span>

          <span className="register-arrow">
            →
          </span>
        </button>

        {/* DIVIDER */}

        <div className="register-divider">
          <span></span>

          <p>SYNCSPACE</p>

          <span></span>
        </div>

        {/* LOGIN */}

        <p className="register-footer">
          Already have an account?

          <button
            type="button"
            onClick={goToLogin}
            className="register-login-link"
          >
            Login
          </button>
        </p>

        {/* SECURITY */}

        <div className="register-security">
          ✨ Free workspace • Real-time collaboration
        </div>

      </form>
    </div>
  );
}

export default Register;

