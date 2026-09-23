// Root startup file for cPanel LiteSpeed (lsnode) and Passenger.
// LiteSpeed sets LSNODE_SOCKET (a Unix socket path) instead of a numeric port.
// This shim patches http.Server.prototype.listen so Next.js standalone binds to the socket.
const http = require("http");
const socketPath = process.env.LSNODE_SOCKET;

if (socketPath) {
  const originalListen = http.Server.prototype.listen;
  http.Server.prototype.listen = function (...args) {
    const callback = args.find((a) => typeof a === "function");
    return originalListen.call(this, socketPath, callback);
  };
}

process.env.PORT = process.env.PORT || 3000;
require("./.next/standalone/server.js");
