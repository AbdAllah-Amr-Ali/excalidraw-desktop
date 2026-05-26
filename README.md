# Excalidraw Desktop

Self-contained Windows desktop app wrapping [Excalidraw](https://github.com/excalidraw/excalidraw) — the open-source virtual whiteboard. Fully offline, no internet required. Packaged as an NSIS installer with a custom frameless UI, theme-adaptive title bar, and 229 pre-loaded community libraries.

## Features

- **Frameless window** — No OS chrome (`frame: false`), custom 32px title bar with drag region
- **Excalidraw pencil logo** — The official logo SVG (extracted from `ExcalidrawLogo.tsx`) shown before the title
- **Virgil font** — Title bar label rendered in Excalidraw's signature hand-drawn font at 14px
- **Theme-adaptive title bar** — Colors read dynamically from Excalidraw's CSS variables (`--default-bg-color`, `--color-on-surface`, `--color-surface-high`). A `MutationObserver` watches `.excalidraw` for `theme--dark`/`theme--light` class changes and re-syncs instantly — title bar matches the canvas background on every theme toggle
- **Custom SVG window controls** — Minimize, maximize/restore (icon swaps via IPC `onMaximizeChange`), and close (red `#e81123` hover). Scale animation (`transform: scale(0.85)`) on click
- **229 pre-loaded offline libraries** — All community-contributed stencil libraries from the [excalidraw-libraries](https://github.com/excalidraw/excalidraw-libraries) repo. On first run, injected JavaScript fetches them from the local server (10 concurrent), writes to IndexedDB in Excalidraw's native format (`{ libraryItems }` at key `"libraryData"`), then reloads the page once so they appear in the library panel
- **Offline library URL interception** — `window.fetch` is monkey-patched to rewrite `raw.githubusercontent.com/excalidraw/excalidraw-libraries/` requests to the local server. Any `#addLibrary` installation from `libraries.excalidraw.com` resolves offline
- **winCodeSign / 7za symlink fix** — A C# wrapper around `7za.exe` strips the `-snld` flag (which requires admin rights for symlink creation), allowing the build to succeed without elevated privileges
- **No code signing** — Builds without a signing certificate; installer works normally on Windows

## Architecture

```
┌───────────────────────────────────────────────────┐
│  Electron Main Process (main.js)                  │
│  ├── BrowserWindow(frame: false, bg: #121212)     │
│  ├── IPC handlers: min / max / close / isMaximized│
│  └── injectTitleBar() on did-finish-load          │
│       ├── CSS injection (Virgil font, CSS vars,   │
│       │   animations, no border-radius)           │
│       └── JS injection (SVG controls, observer,   │
│           IndexedDB preload, fetch monkey-patch)  │
└────┬──────────────────────────────────────────────┘
     │  preload.js (contextBridge)
┌────▼──────────────────────────────────────────────┐
│  Renderer Process                                  │
│  ┌────────────────────────────────────────────┐   │
│  │  Custom Title Bar (32px, -webkit-app-region)│   │
│  │  [Excalidraw SVG] [Excalidraw] ▲───▼ [X]   │   │
│  └────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────┐   │
│  │  Excalidraw App (React SPA)                │   │
│  │  server.js → static /excalidraw-build/     │   │
│  │           → static /libraries/             │   │
│  └────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────┐   │
│  │  IndexedDB (excalidraw-library-db)          │   │
│  │  → "excalidraw-library-store"              │   │
│  │  → key: "libraryData"                      │   │
│  │  → { libraryItems: [229 libraries] }       │   │
│  └────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┘
```

## How It Works

### Title Bar Injection

When `did-finish-load` fires, `injectTitleBar()` runs two injections:

1. **CSS** — Injected via `webContents.insertCSS()`:
   - `body { padding-top: 32px }` pushes app content below the title bar
   - `.custom-titlebar` uses CSS custom properties (`--titlebar-bg`, `--titlebar-text`, `--btn-hover`) with dark-mode fallbacks
   - `.win-btn:active svg { transform: scale(0.85) }` for click animation

2. **JavaScript** — Injected via `webContents.executeJavaScript()`:
   - Creates the title bar DOM (logo SVG + label + spacer + window control buttons)
   - Attaches click handlers that call `window.__electronWindow.{minimize, maximizeOrUnmaximize, close}`
   - Subscribes to `onMaximizeChange` from the main process to swap the maximize/restore icon
   - `syncTitlebarColors()` reads `getComputedStyle().getPropertyValue()` for `--default-bg-color`, `--color-on-surface`, `--color-surface-high` from the `.excalidraw` element
   - A `MutationObserver` on `.excalidraw` detects `theme--dark`/`theme--light` class changes and re-syncs colors

### Offline Libraries

1. The [excalidraw-libraries](https://github.com/excalidraw/excalidraw-libraries) repo is cloned to `libraries/`
2. `server.js` mounts `express.static(librariesPath)` at the `/libraries` route
3. On first app launch, the injected JavaScript:
   - Opens IndexedDB database `excalidraw-library-db`, store `excalidraw-library-store`
   - Checks if key `"libraryData"` already exists with items — if so, skips
   - Fetches `/libraries/libraries.json` to get the 229-entry manifest
   - Processes all 229 libraries with 10 concurrent fetches
   - Converts old v1 format (`library`: array of element arrays) to v2 format (`libraryItems`: array of `{ id, status, elements, created }` objects)
   - Writes `{ libraryItems: [...] }` to IndexedDB at key `"libraryData"`
   - Calls `location.reload()` so Excalidraw's `LibraryIndexedDBAdapter.load()` picks up the data
4. `window.fetch` is monkey-patched to intercept any `raw.githubusercontent.com/excalidraw/excalidraw-libraries/` URL and rewrite it to the local server — this lets `#addLibrary` hash-based library installations work offline

### winCodeSign / 7za Wrapper

The original `7za.exe` from `7zip-bin` uses the `-snld` flag when extracting archives, which calls `CreateSymbolicLink` — a Windows privilege that non-admin users lack. A C# wrapper (`7za-wrapper.cs`) is compiled with `csc.exe` (built into .NET Framework 4.8) and placed at `node_modules\7zip-bin\win\x64\7za.exe`. The wrapper:
- Parses the command-line arguments
- Strips the `-snld` flag
- Delegates to `7za_original.exe`
- Maps exit code 2 (symlink warning) to exit code 0 (success)

## Building from Source

### Prerequisites

- Node.js 18+
- Yarn
- .NET Framework 4.8 (for `csc.exe` — included with Windows)

### Steps

```bash
# 1. Build Excalidraw SPA
git clone --depth 1 https://github.com/excalidraw/excalidraw.git
cd excalidraw
yarn install
yarn build --filter=@excalidraw/excalidraw-app
mkdir ../excalidraw-desktop
xcopy /E excalidraw-app\build ..\excalidraw-desktop\excalidraw-build\

# 2. Set up desktop project
cd ../excalidraw-desktop
npm install

# 3. Download libraries (229 .excalidrawlib files + manifest)
powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/excalidraw/excalidraw-libraries/master/libraries.json' -OutFile 'libraries\libraries.json'"
# (Run the download script from main.js's preload logic, or download individually)

# 4. Build the 7za wrapper (if rebuilding winCodeSign)
csc.exe /target:exe /out:node_modules\7zip-bin\win\x64\7za.exe 7za-wrapper.cs
copy node_modules\7zip-bin\win\x64\7za.exe node_modules\7zip-bin\win\x64\7za_original.exe

# 5. Build NSIS installer
npx electron-builder --win --publish never
```

Output: `build\Excalidraw Setup 1.0.0.exe`

## Project Structure

```
excalidraw-desktop/
├── main.js                      # Electron main process
│                                #   - BrowserWindow(frame: false)
│                                #   - IPC handlers
│                                #   - injectTitleBar() (CSS + JS)
├── preload.js                   # contextBridge
│                                #   - __electronWindow API
├── server.js                    # Express static server
│                                #   - Serves /excalidraw-build/
│                                #   - Serves /libraries/
├── 7za-wrapper.cs               # C# source for 7za symlink fix
├── package.json                 # electron-builder config + deps
├── excalidraw-build/            # Built Excalidraw SPA output
│   └── index.html               # Entry point
├── libraries/                   # excalidraw-libraries repo
│   ├── libraries.json           # 229-entry manifest
│   ├── lipis/                   # Library files by author
│   ├── ferminrp/
│   ├── g-script/
│   └── ... (229 .excalidrawlib)
├── assets/
│   └── icon.ico                 # App icon
├── node_modules/
│   └── 7zip-bin/win/x64/
│       ├── 7za.exe              # C# wrapper (strips -snld)
│       └── 7za_original.exe     # Original 7za binary
└── build/
    └── Excalidraw Setup 1.0.0.exe
    └── Excalidraw Setup 1.0.0.exe.blockmap
```

## Tech Stack

| Component | Technology |
|---|---|
| Desktop shell | Electron 35 |
| Static server | Express 4 (random port, `127.0.0.1` binding) |
| Whiteboard | Excalidraw (React SPA, built from source) |
| IndexedDB | Raw IndexedDB API + idb-keyval (Excalidraw's internal adapter) |
| Packaging | electron-builder 25 / NSIS |
| 7za fix | C# (.NET Framework 4.8, compiled with `csc.exe`) |
| Libraries | excalidraw-libraries (229 community stencil sets) |

## Troubleshooting

**Build fails with "Fatal error: Unable to commit changes"** — The `rcedit-x64.exe` version-string update can intermittently fail. electron-builder retries 3 times automatically; the build usually succeeds on a subsequent retry.

**"Create Symbolic Links" privilege error in winCodeSign** — If you rebuild winCodeSign and the original `7za.exe` is restored, re-deploy the C# wrapper: copy `7za-wrapper.cs` → compile with `csc.exe` → place at `node_modules\7zip-bin\win\x64\7za.exe`.

**No libraries after install** — On first run, the pre-load fetches all 229 libraries from the local server and reloads the page. Check the DevTools console for fetch errors. If `libraries/libraries.json` or any `.exacalidrawlib` file is missing, re-run the download step.

**Title bar colors not updating** — The `MutationObserver` watches `.excalidraw` for class changes. If Excalidraw's theme toggle mechanism changes, the CSS variable selector may need updating. The relevant CSS variables are `--default-bg-color`, `--color-on-surface`, and `--color-surface-high`.
