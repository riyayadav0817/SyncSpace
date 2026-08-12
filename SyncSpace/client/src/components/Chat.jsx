import { useEffect, useState } from "react";

function Chat({ joinedRoom, socket }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  // =========================
  // RECEIVE MESSAGES
  // =========================

  useEffect(() => {
    const handleChatMessage = (data) => {
      setMessages((oldMessages) => [
        ...oldMessages,
        data,
      ]);
    };

    socket.on("chat-message", handleChatMessage);

    return () => {
      socket.off("chat-message", handleChatMessage);
    };
  }, [socket]);

  // =========================
  // SEND MESSAGE
  // =========================

  const sendMessage = (event) => {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    if (!joinedRoom) {
      alert("Please join a room first");
      return;
    }

    socket.emit("chat-message", {
      roomId: joinedRoom,
      message: trimmedMessage,
    });

    setMessage("");
  };

  return (
    <div
      style={{
        background: "#1e293b",
        padding: "20px",
        borderRadius: "12px",
        marginTop: "20px",
      }}
    >
      <h2>💬 Team Chat</h2>

      {!joinedRoom ? (
        <p
          style={{
            color: "#94a3b8",
          }}
        >
          Join a room to start chatting.
        </p>
      ) : (
        <>
          {/* =========================
              MESSAGES
          ========================= */}

          <div
            style={{
              height: "250px",
              background: "#0f172a",
              borderRadius: "8px",
              padding: "15px",
              overflowY: "auto",
              marginBottom: "15px",
            }}
          >
            {messages.length === 0 ? (
              <p
                style={{
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((item, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "12px",
                    padding: "10px",
                    background: "#1e293b",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#38bdf8",
                      marginBottom: "4px",
                    }}
                  >
                    {item.user}
                  </div>

                  <div
                    style={{
                      color: "white",
                    }}
                  >
                    {item.message}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* =========================
              MESSAGE INPUT
          ========================= */}

          <form
            onSubmit={sendMessage}
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                outline: "none",
              }}
            />

            <button
              type="submit"
              style={{
                padding: "12px 20px",
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default Chat;