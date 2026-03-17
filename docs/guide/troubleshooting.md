# Troubleshooting

This page covers the most common problems encountered when setting up or running LocalFlux, grouped by category. If your issue is not listed here, [open a GitHub issue](https://github.com/Unknownbeliek/localflux/issues) with the details described at the bottom of this page.

## Connection problems

### Frontend is stuck at "Connecting…"

The client cannot reach the backend WebSocket server.

**Checklist:**

1. Confirm the backend is running:
   ```bash
   # from server/
   npm run dev
   # should print: LocalFlux server -> http://localhost:3000
   ```
2. Check `client/.env`:
   ```env
   VITE_BACKEND_URL=http://localhost:3000
   ```
3. Restart the Vite dev server **after** changing the `.env` file — Vite bakes env
   vars at build time and does not hot-reload them.
4. Open browser DevTools → Network tab → look for a failing WebSocket handshake.

### Players on other devices cannot connect (LAN)

The backend binds to `0.0.0.0`, so it is reachable on all network interfaces. However, `localhost` in `VITE_BACKEND_URL` resolves only to the host machine itself. Players on other devices need the LAN IP address.

**Step 1 — Find your machine’s LAN IP:**

::: code-group

```bash [macOS]
ipconfig getifaddr en0
# or, for all active interfaces:
ifconfig | grep "inet " | grep -v 127.0.0.1
```

```bash [Linux]
ip route get 1 | awk '{print $7; exit}'
# or
hostname -I | awk '{print $1}'
```

```powershell [Windows]
ipconfig | findstr /i "IPv4"
```

:::

The output will be something like `192.168.1.42`. Use that IP in the next step.

**Step 2 — Update `client/.env`:**

```env
VITE_BACKEND_URL=http://192.168.1.42:3000
```

**Step 3 — Restart the Vite dev server** after saving `.env`.

**Step 4 — Allow the port through your OS firewall.** See [Deployment → Firewall](/guide/deployment#firewall) for platform-specific steps.

### "Failed to connect" in GitHub Codespaces

Codespaces virtualises ports — `localhost` on the client does not reach the
server container directly.

1. In the **Ports** tab, forward port `3000` and set visibility to **Public** (or
   at least to your account).
2. Copy the forwarded HTTPS URL (e.g. `https://xxx-3000.app.github.dev`).
3. Paste it into `client/.env`:
   ```env
   VITE_BACKEND_URL=https://xxx-3000.app.github.dev
   ```
4. Restart the client dev server.

---

## Server problems

### Address already in use (EADDRINUSE :3000)

A previous server process is still holding the port. Find and terminate it:

::: code-group

```bash [macOS / Linux]
# Identify the process
lsof -i :3000

# Terminate it (replace <PID> with the number shown)
kill <PID>
```

```powershell [Windows]
# Identify the process
netstat -ano | findstr :3000

# Terminate it (replace <PID> with the number in the last column)
taskkill /PID <PID> /F
```

:::

Alternatively, start the server on a different port and update `VITE_BACKEND_URL` to match:

::: code-group

```bash [macOS / Linux]
PORT=3001 npm run dev
```

```powershell [Windows]
$env:PORT=3001; npm run dev
```

:::

### Deck not loading — "Cannot read file"

- Confirm `data/decks/movie.json` exists in the repository root.
- If you pass a custom path via `DECK_PATH`, verify it is an **absolute** path or
  relative to the working directory where you start the server (not relative to
  `server/`).
- Validate the JSON is parseable: `node -e "require('./data/decks/movie.json')"`.

### Tests fail with "Cannot find module"

Run the tests from the `server/` directory, not the repository root:

```bash
cd server && npm test
```

Or use the npm `--prefix` flag from the root:

```bash
npm test --prefix server
```

---

## Client / build problems

### `npm install` fails with ERESOLVE

React 19 occasionally triggers peer-dependency conflicts in community packages.
Retry with the legacy resolver:

```bash
npm install --legacy-peer-deps
```

Use only when needed — the flag skips peer-dep checks, so test your changes
thoroughly afterwards.

### Vite hot-reload not working

Vite’s HMR requires the browser to open a WebSocket back to the Vite dev server. In Codespaces or behind a proxy:

1. Open the **Ports** tab and confirm the Vite port (default `5173`) is forwarded.
2. If the page loads but HMR is still broken, a hard refresh usually resolves it:
   - **Windows / Linux:** `Ctrl + Shift + R`
   - **macOS:** `Cmd + Shift + R`

### Environment variable shows as `undefined` in the browser

- The variable **must** be prefixed with `VITE_` — other names are stripped by
  Vite at build time.
- The file must be named `.env` (or `.env.local`) and live in `client/`.
- Restart the Vite dev server after every change to `.env`.

---

## Game-logic problems

### Room PIN rejected — "Room not found"

PINs are 4-digit codes generated fresh each time a host creates a room.  
They are **not** persisted between server restarts. If the server was restarted
after the room was created, the PIN is gone — ask the host to create a new room.

### Scoreboard shows wrong order after reconnect

If a player reconnects during a question, their score is preserved but the
in-progress answer for that question is not. This is expected; scores from all
previous rounds are kept.

---

## Still stuck?

[Open an issue](https://github.com/Unknownbeliek/localflux/issues/new) and include the following information so we can reproduce the problem:

- Node.js version: `node -v`
- npm version: `npm -v`
- Operating system and version
- The full error message from the browser console or server terminal
- Steps to reproduce the issue
