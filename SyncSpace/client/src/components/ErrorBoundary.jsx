import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      "SyncSpace Error Boundary:",
      error,
      errorInfo
    );
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#0f172a",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "30px",
          }}
        >
          <div
            style={{
              maxWidth: "500px",
              textAlign: "center",
              background: "#1e293b",
              padding: "30px",
              borderRadius: "12px",
            }}
          >
            <h2>⚠️ Workspace Error</h2>

            <p style={{ color: "#94a3b8" }}>
              Something went wrong in this workspace.
            </p>

            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: "10px 18px",
                border: "none",
                borderRadius: "8px",
                background: "#2563eb",
                color: "white",
                cursor: "pointer",
              }}
            >
              🔄 Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;