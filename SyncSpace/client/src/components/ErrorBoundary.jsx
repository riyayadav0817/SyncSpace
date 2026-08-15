import React from "react";

class ErrorBoundary extends React.Component {
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
    console.error("🚨 SyncSpace Error:", error);
    console.error("Component Stack:", errorInfo.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "300px",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f172a",
            color: "white",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "50px" }}>
            ⚠️
          </div>

          <h2 style={{ marginBottom: "8px" }}>
            Workspace Error
          </h2>

          <p
            style={{
              color: "#94a3b8",
              marginBottom: "20px",
            }}
          >
            Something went wrong in this workspace.
          </p>

          {/* TEMPORARY DEBUG ERROR */}

          {this.state.error && (
            <pre
              style={{
                width: "90%",
                maxWidth: "800px",
                padding: "15px",
                background: "#020617",
                color: "#fca5a5",
                border: "1px solid #7f1d1d",
                borderRadius: "8px",
                textAlign: "left",
                whiteSpace: "pre-wrap",
                overflow: "auto",
                fontSize: "13px",
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}

          <button
            type="button"
            onClick={this.handleReload}
            style={{
              marginTop: "20px",
              padding: "10px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#2563eb",
              color: "white",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            🔄 Reload Workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;