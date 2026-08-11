function Header({ status }) {
  return (
    <header
      style={{
        textAlign: "center",
        marginBottom: "20px",
      }}
    >
      <h1>🚀 SyncSpace</h1>

      <p
        style={{
          color: status.includes("Connected")
            ? "#22c55e"
            : "#facc15",
          fontWeight: "bold",
        }}
      >
        {status}
      </p>
    </header>
  );
}

export default Header;