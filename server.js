const express = require("express");
const path = require("path");

let serverInstance = null;

function startServer() {
  return new Promise((resolve, reject) => {
    const app = express();
    const buildPath = path.join(__dirname, "excalidraw-build");
    const librariesPath = path.join(__dirname, "libraries");

    app.use("/libraries", express.static(librariesPath));
    app.use(express.static(buildPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(buildPath, "index.html"));
    });

    serverInstance = app.listen(0, "127.0.0.1", () => {
      const port = serverInstance.address().port;
      resolve(port);
    });

    serverInstance.on("error", reject);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(resolve);
      serverInstance = null;
    } else {
      resolve();
    }
  });
}

module.exports = { startServer, stopServer };
