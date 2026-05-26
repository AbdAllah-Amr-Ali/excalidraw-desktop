const { app, BrowserWindow, shell, dialog, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const { startServer, stopServer } = require("./server");

let mainWindow = null;
let server = null;

const isDev = !app.isPackaged;

function injectTitleBar(win) {
  const css = `
body {
  padding-top: 32px !important;
  box-sizing: border-box !important;
  border-radius: 0;
  overflow: hidden;
  transition: padding-top 0.2s ease;
}
.custom-titlebar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 0 0 12px;
  z-index: 999999;
  -webkit-app-region: drag;
  box-sizing: border-box;
  user-select: none;
  background: var(--titlebar-bg, #121212);
  color: var(--titlebar-text, #e3e3e8);
  transition: background 0.25s ease, color 0.25s ease;
}
.custom-titlebar .titlebar-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  color: var(--titlebar-text, #e3e3e8);
  opacity: 0.85;
}
.custom-titlebar .titlebar-label {
  font-family: "Virgil", "Segoe UI", sans-serif;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}
.custom-titlebar .titlebar-spacer {
  flex: 1;
}
.custom-titlebar .win-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}
.custom-titlebar .win-btn {
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.1s ease;
  font-family: "Segoe MDL2 Assets", "Segoe UI", sans-serif;
}
.custom-titlebar .win-btn svg {
  transition: transform 0.12s ease;
}
.custom-titlebar .win-btn:active svg {
  transform: scale(0.85);
}
.custom-titlebar .win-btn:hover {
  background: var(--btn-hover, rgba(255,255,255,0.1));
}
.custom-titlebar .win-btn.close:hover {
  background: #e81123 !important;
  color: #fff !important;
}
`;

  const js = `
(function() {
  var existing = document.querySelector('.custom-titlebar');
  if (existing) existing.remove();

  var bar = document.createElement('div');
  bar.className = 'custom-titlebar';

  var minimizeSVG = '<svg width="10" height="1" viewBox="0 0 10 1"><path d="M0 0h10v1H0z" fill="currentColor"/></svg>';
  var maximizeSVG = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0h10v10H0V0zm1 1v8h8V1H1z" fill="currentColor"/></svg>';
  var closeSVG = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M.28.28a.96.96 0 011.36 0L5 3.64 8.36.28a.96.96 0 111.36 1.36L6.36 5l3.36 3.36a.96.96 0 11-1.36 1.36L5 6.36 1.64 9.72a.96.96 0 11-1.36-1.36L3.64 5 .28 1.64a.96.96 0 010-1.36z" fill="currentColor"/></svg>';
  var restoreSVG = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 0v2H0v8h8V8h2V0H2zm0 9H1V3h6v6H2zm7-2H8V2H3V1h6v6z" fill="currentColor"/></svg>';

  var logoIconSVG = '<svg viewBox="0 0 40 40" width="18" height="18" fill="currentColor"><path d="M39.9 32.889a.326.326 0 0 0-.279-.056c-2.094-3.083-4.774-6-7.343-8.833l-.419-.472a.212.212 0 0 0-.056-.139.586.586 0 0 0-.167-.111l-.084-.083-.056-.056c-.084-.167-.28-.278-.475-.167-.782.39-1.507.973-2.206 1.528-.92.722-1.842 1.445-2.708 2.25a8.405 8.405 0 0 0-.977 1.028c-.14.194-.028.361.14.444-.615.611-1.23 1.223-1.843 1.861a.315.315 0 0 0-.084.223c0 .083.056.166.111.194l1.09.833v.028c1.535 1.528 4.244 3.611 7.12 5.861.418.334.865.667 1.284 1 .195.223.39.473.558.695.084.11.28.139.391.055.056.056.14.111.196.167a.398.398 0 0 0 .167.056.255.255 0 0 0 .224-.111.394.394 0 0 0 .055-.167c.029 0 .028.028.056.028a.318.318 0 0 0 .224-.084l5.082-5.528a.309.309 0 0 0 0-.444Zm-14.63-1.917a.485.485 0 0 0 .111.14c.586.5 1.2 1 1.843 1.555l-2.569-1.945-.251-.166c-.056-.028-.112-.084-.168-.111l-.195-.167.056-.056.055-.055.112-.111c.866-.861 2.346-2.306 3.1-3.028-.81.805-2.43 3.167-2.095 3.944Zm8.767 6.89-2.122-1.612a44.713 44.713 0 0 0-2.625-2.5c1.145.861 2.122 1.611 2.262 1.75 1.117.972 1.06.806 1.815 1.445l.921.666a1.06 1.06 0 0 1-.251.25Zm.558.416-.056-.028c.084-.055.168-.111.252-.194l-.196.222ZM1.089 5.75c.055.361.14.722.195 1.056.335 1.833.67 3.5 1.284 4.75l.252.944c.084.361.223.806.363.917 1.424 1.25 3.602 3.11 5.947 4.889a.295.295 0 0 0 .363 0s0 .027.028.027a.254.254 0 0 0 .196.084.318.318 0 0 0 .223-.084c2.988-3.305 5.221-6.027 6.813-8.305.112-.111.14-.278.14-.417.111-.111.195-.25.307-.333.111-.111.111-.306 0-.39l-.028-.027c0-.055-.028-.139-.084-.167-.698-.666-1.2-1.138-1.731-1.638-.922-.862-1.871-1.75-3.881-3.75l-.028-.028c-.028-.028-.056-.056-.112-.056-.558-.194-1.703-.389-3.127-.639C6.087 2.223 3.21 1.723.614.944c0 0-.168 0-.196.028l-.083.084c-.028.027-.056.055-.224.11h.056-.056c.028.167.028.278.084.473 0 .055.112.5.112.555l.782 3.556Zm15.496 3.278-.335-.334c.084.112.196.195.335.334Zm-3.546 4.666-.056.056c0-.028.028-.056.056-.056Zm-2.038-10c.168.167.866.834 1.033.973-.726-.334-2.54-1.167-3.379-1.445.838.167 1.983.334 2.346.472ZM1.424 2.306c.419.722.754 3.222 1.089 5.666-.196-.778-.335-1.555-.503-2.278-.251-1.277-.503-2.416-.838-3.416.056 0 .14 0 .252.028Zm-.168-.584c-.112 0-.223-.028-.307-.028 0-.027 0-.055-.028-.055.14 0 .223.028.335.083Zm-1.089.222c0-.027 0-.027 0 0ZM39.453 1.333c.028-.11-.558-.61-.363-.639.42-.027.42-.666 0-.666-.558.028-1.144.166-1.675.25-.977.194-1.982.389-2.96.61-2.205.473-4.383.973-6.561 1.557-.67.194-1.424.333-2.066.666-.224.111-.196.333-.084.472-.056.028-.084.028-.14.056-.195.028-.363.056-.558.083-.168.028-.252.167-.224.334 0 .027.028.083.028.11-1.173 1.556-2.485 3.195-3.909 4.945-1.396 1.611-2.876 3.306-4.356 5.056-4.719 5.5-10.052 11.75-15.943 17.25a.268.268 0 0 0 0 .389c.028.027.056.055.084.055-.084.084-.168.14-.252.222-.056.056-.084.111-.084.167a.605.605 0 0 0-.111.139c-.112.111-.112.305.028.389.111.11.307.11.39-.028.029-.028.029-.056.056-.056a.44.44 0 0 1 .615 0c.335.362.67.723.977 1.028l-.698-.583c-.112-.111-.307-.083-.39.028-.113.11-.085.305.027.389l7.427 6.194c.056.056.112.056.196.056s.14-.028.195-.084l.168-.166c.028.027.083.027.111.027.084 0 .14-.027.196-.083 10.052-10.055 18.15-17.639 27.42-24.417.083-.055.111-.166.111-.25.112 0 .196-.083.251-.194 1.704-5.194 2.039-9.806 2.15-12.083v-.028c0-.028.028-.056.028-.083.028-.056.028-.084.028-.084a1.626 1.626 0 0 0-.111-1.028ZM21.472 9.5c.446-.5.893-1.028 1.34-1.5-2.876 3.778-7.65 9.583-14.408 16.5 4.607-5.083 9.242-10.333 13.068-15ZM5.193 35.778h.084-.084Zm3.462 3.194c-.027-.028-.027-.028 0-.028v.028Zm4.16-3.583c.224-.25.448-.472.699-.722 0 0 0 .027.028.027-.252.223-.475.445-.726.695Zm1.146-1.111c.14-.14.279-.334.446-.5l.028-.028c1.648-1.694 3.351-3.389 5.082-5.111l.028-.028c.419-.333.921-.694 1.368-1.028a379.003 379.003 0 0 0-6.952 6.695ZM24.794 6.472c-.921 1.195-1.954 2.778-2.82 4.028-2.736 3.944-11.532 13.583-11.727 13.75a1976.983 1976.983 0 0 1-8.042 7.639l-.167.167c-.14-.167-.14-.417.028-.556C14.49 19.861 22.03 10.167 25.074 5.917c-.084.194-.14.36-.28.555Zm4.83 5.695c-1.116-.64-1.646-1.64-1.34-2.611l.084-.334c.028-.083.084-.194.14-.277.307-.5.754-.917 1.257-1.167.027 0 .055 0 .083-.028-.028-.056-.028-.139-.028-.222.028-.167.14-.278.335-.278.335 0 1.369.306 1.76.639.111.083.223.194.335.305.14.167.363.445.474.667.056.028.112.306.196.445.056.222.111.472.084.694-.028.028 0 .194-.028.194a2.668 2.668 0 0 1-.363 1.028c-.028.028-.028.056-.056.084l-.028.027c-.14.223-.335.417-.53.556-.643.444-1.369.583-2.095.389 0 0-.195-.084-.28-.111Zm8.154-.834a39.098 39.098 0 0 1-.893 3.167c0 .028-.028.083 0 .111-.056 0-.084.028-.14.056-2.206 1.61-4.356 3.305-6.506 5.028 1.843-1.64 3.686-3.306 5.613-4.945.558-.5.949-1.139 1.06-1.861l.28-1.667v-.055c.14-.334.67-.195.586.166Z"/></svg>';

  bar.innerHTML =
    '<span class="titlebar-icon">' + logoIconSVG + '</span>' +
    '<span class="titlebar-label">Excalidraw</span>' +
    '<span class="titlebar-spacer"></span>' +
    '<div class="win-controls">' +
      '<button class="win-btn minimize" title="Minimize">' + minimizeSVG + '</button>' +
      '<button class="win-btn maximize" title="Maximize">' + maximizeSVG + '</button>' +
      '<button class="win-btn close" title="Close">' + closeSVG + '</button>' +
    '</div>';

  document.body.prepend(bar);

  document.querySelector('.win-btn.minimize').onclick = function(e) {
    e.stopPropagation();
    window.__electronWindow.minimize();
  };

  document.querySelector('.win-btn.maximize').onclick = function(e) {
    e.stopPropagation();
    window.__electronWindow.maximizeOrUnmaximize();
  };

  document.querySelector('.win-btn.close').onclick = function(e) {
    e.stopPropagation();
    window.__electronWindow.close();
  };

  window.__electronWindow.onMaximizeChange(function(m) {
    var btn = document.querySelector('.win-btn.maximize');
    if (btn) {
      btn.innerHTML = m ? restoreSVG : maximizeSVG;
      btn.title = m ? 'Restore' : 'Maximize';
    }
  });
  window.__electronWindow.isMaximized().then(function(m) {
    var btn = document.querySelector('.win-btn.maximize');
    if (btn) {
      btn.innerHTML = m ? restoreSVG : maximizeSVG;
      btn.title = m ? 'Restore' : 'Maximize';
    }
  });

  function syncTitlebarColors() {
    var el = document.querySelector('.excalidraw') || document.querySelector('#root');
    if (!el) return;
    var style = getComputedStyle(el);
    var bg = style.getPropertyValue('--default-bg-color').trim() || '#121212';
    var text = style.getPropertyValue('--color-on-surface').trim() || '#e3e3e8';
    var btnHover = style.getPropertyValue('--color-surface-high').trim() || 'rgba(255,255,255,0.1)';
    if (bg) document.documentElement.style.setProperty('--titlebar-bg', bg);
    if (text) document.documentElement.style.setProperty('--titlebar-text', text);
    if (btnHover) document.documentElement.style.setProperty('--btn-hover', btnHover);
  }

  var dark = document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('light', !dark);

  var colorSyncInterval = setInterval(function() {
    var el = document.querySelector('.excalidraw');
    if (el) {
      syncTitlebarColors();
      clearInterval(colorSyncInterval);
      var excalidrawObserver = new MutationObserver(function() {
        syncTitlebarColors();
      });
      excalidrawObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
    }
  }, 100);

  var dbReq = indexedDB.open('excalidraw-library-db');
  dbReq.onupgradeneeded = function() {
    dbReq.result.createObjectStore('excalidraw-library-store');
  };
  dbReq.onsuccess = function() {
    var db = dbReq.result;
    var tx = db.transaction('excalidraw-library-store', 'readonly');
    var store = tx.objectStore('excalidraw-library-store');
    var getReq = store.get('libraryData');
    getReq.onsuccess = function() {
      if (getReq.result && getReq.result.libraryItems && getReq.result.libraryItems.length > 0) return;
      fetch('/libraries/libraries.json').then(function(r) { return r.json(); }).then(function(manifest) {
        var allItems = [];
        var loaded = 0;
        var idx = 0;
        var active = 0;
        var completed = 0;
        var total = manifest.length;
        var c = 10;
        function processNext() {
          while (active < c && idx < total) {
            var src = manifest[idx++].source;
            active++;
            (function(s) {
              fetch('/libraries/' + s).then(function(r) { return r.json(); }).then(function(lib) {
                if (lib && lib.libraryItems) {
                  lib.libraryItems.forEach(function(item) { allItems.push(item); });
                } else if (lib && lib.library && Array.isArray(lib.library)) {
                  lib.library.forEach(function(elements) {
                    allItems.push({ id: 'lib-' + (loaded++), status: 'published', elements: elements, created: Date.now() });
                  });
                }
              }).catch(function() { }).then(function() {
                active--;
                completed++;
                if (completed >= total) finishLoad(allItems);
                else processNext();
              });
            })(src);
          }
          if (active === 0 && completed >= total) finishLoad(allItems);
        }
        function finishLoad(items) {
          if (!items.length) return;
          var writeTx = db.transaction('excalidraw-library-store', 'readwrite');
          var writeStore = writeTx.objectStore('excalidraw-library-store');
          writeStore.put({ libraryItems: items }, 'libraryData');
          writeTx.oncomplete = function() { setTimeout(function() { location.reload(); }, 300); };
        }
        processNext();
      });
    };
  };

  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    var url = (typeof input === 'string' ? input : input && input.url) || '';
    if (url.indexOf('raw.githubusercontent.com/excalidraw/excalidraw-libraries') !== -1) {
      return origFetch(url.replace('https://raw.githubusercontent.com/excalidraw/excalidraw-libraries/master/libraries/', window.location.origin + '/libraries/'), init);
    }
    return origFetch(input, init);
  };
})();
`;

  win.webContents.insertCSS(css);
  win.webContents.executeJavaScript(js);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    icon: path.join(__dirname, "assets", "icon.ico"),
    title: "Excalidraw",
    backgroundColor: "#121212",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("maximize-changed", true);
  });

  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("maximize-changed", false);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-finish-load", () => {
    injectTitleBar(mainWindow);
  });

  const port = await startServer();
  await mainWindow.loadURL(`http://localhost:${port}`);
}

ipcMain.handle("minimize-window", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle("maximize-window", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle("close-window", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle("is-maximized", () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", async () => {
  await stopServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  await stopServer();
});
