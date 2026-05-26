const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onOpenFile: (callback) => ipcRenderer.on("open-file", (_event, filePath) => callback(filePath)),
});

contextBridge.exposeInMainWorld("__electronWindow", {
  minimize: () => ipcRenderer.invoke("minimize-window"),
  maximizeOrUnmaximize: () => ipcRenderer.invoke("maximize-window"),
  close: () => ipcRenderer.invoke("close-window"),
  isMaximized: () => ipcRenderer.invoke("is-maximized"),
  onMaximizeChange: (callback) =>
    ipcRenderer.on("maximize-changed", (_event, maximized) => callback(maximized)),
});
