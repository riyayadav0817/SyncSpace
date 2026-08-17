const http = require("http");
const { setupWSConnection } = require("y-websocket/bin/utils.js");

const PORT = 1234;

const server = http.createServer();

server.on("upgrade", (request, socket, head) => {
  setupWSConnection(socket, request, {});

  if (head) {
    socket.unshift(head);
  }
});

server.listen(PORT, () => {
  console.log(`Yjs WebSocket server running on port ${PORT}`);
});