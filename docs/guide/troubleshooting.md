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
   ```bash
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

```bash
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
   ```bash
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

## Type Guess problems

### Type Guess answers not accepted (student says they got it right)

Fuzzy matching uses Levenshtein distance (configurable typo tolerance) plus variants. Check:

1. **Case/whitespace**: Server normalizes to lowercase, no leading/trailing spaces
   - ✓ Input: "  PARIS" → Normalized: "paris" ✓
   - ✗ Input: "Paris france" → Normalized: "paris france" (matches only if you defined this variant)

2. **Variants not registered**: Add to `fuzzy_allowances` in your deck:
   ```json
   {
     "correct_answer": "Pyongyang",
     "fuzzy_allowances": ["pyong yang", "north korea capital"]
   }
   ```

3. **Threshold tuning**: Increase `TYPE_GUESS_THRESHOLD` strictness only if needed. Lower values are more forgiving:
   ```javascript
   TYPE_GUESS_THRESHOLD: 0.75
   ```

4. **Test the matching**:
   ```bash
   # Restart server and try the answer again
   DECK_PATH=data/decks/your-deck.json npm run dev --prefix server
   ```

### Type Guess timeout during typing

Players may not receive the countdown timer synced with the server. Known limitations:
- Timer is visual only; server enforces cutoff
- Very fast typists may submit after the server's cutoff
- Increase `time_limit_ms` in the deck if this is frequent

---

## Chat problems

### Chat message not appearing

1. Confirm the host set chat mode to `FREE` or `RESTRICTED` (not `OFF`)
2. If `FREE` mode, check if rate limiter kicked in: max 1 msg per 2 seconds
3. Check browser console for errors
4. If the message contains profanity, it was rejected (intentional)

### Player muted but wants to unmute

Only the host can un-mute. Host looks at the lobby player list, clicks the player's name, and selects **Un-mute**.

### Profanity filter too strict / too loose

Profanity library is configurable but not yet exposed via UI. Edit `server/core/chatManager.js`:

```javascript
const chat = new leo();
// Adjust sensitivity (not yet exposed via env vars)
```

This is a v1.1.0+ feature (custom profanity lists).

---

## Deck Studio problems

### Import CSV fails validation

Check:
1. **Column order**: Must be exactly `type`, `question`, `answer`, `option_2`, `option_3`, `option_4`, `time_limit_ms`
2. **MCQ rows**: Must have 4 options (option_2, option_3, option_4 plus answer = 4 choices)
3. **Type Guess rows**: Leave option columns empty but still include headers
4. **Minimum deck size**: At least 2 questions

### Exported `.flux` file won't load

1. Confirm it's in `server/data/decks/`
2. Validate JSON: `node -e "require('./server/data/decks/my-deck.flux'); console.log('OK')"`
3. Check `DECK_PATH` points to the correct file:
   ```bash
   DECK_PATH=data/decks/my-deck.flux npm run dev --prefix server
   ```

### Changes to deck lost after browser refresh

**Deck Studio stores in localStorage while editing. This is intentional.**

- Export your deck frequently to avoid data loss
- If localStorage was cleared:
  - Re-import from your exported `.flux` file, or
  - Re-create the deck manually

This is a v1.2.0 feature (persistent deck storage on server).

---

## LAN / network problems

### Players drop/timeout on slower Wi-Fi (2.4 GHz)

- 802.11b/g networks (2.4 GHz) are more congested than 5 GHz / Wi-Fi 6
- Tell players to switch to 5 GHz band if available
- Increase server-side heartbeat timeout in `socket.io` config (v1.1.0 feature)

### Some players connect but others can't

If inconsistent across devices:
1. Confirm host machine's firewall is open (see [Deployment → Firewall](/guide/deployment))
2. Ask a connected player to check the host's IP in browser console: `window.location.hostname`
3. Verify other players use the same IP

If all players fail:
- Confirm backend is running: `npm run dev --prefix server`
- Confirm frontend is running: `npm run dev --prefix client`
- Check both are on expected ports (default 3000/5173)

### "Maximum call stack size exceeded"

Rare browser error during Vite dev. Usually happens with older Node.js versions:

```bash
node -v  # Confirm ≥ 18.x
nvm install 20
npm run dev
```

---

## Performance / scaling

### Server becomes unresponsive with 50+ players

This is expected without VIP Bouncer (planned for v1.1.0). Current limits:

| Players | Status |
|---|---|
| 20 | ✓ Stable |
| 40 | ✓ Stable |
| 50 | ⚠️ Degradation begins |
| 70+ | ⚠️ Router can drop packets |

**Workaround**: Split into multiple games (multiple host machines on same LAN).

### Chat with many players becomes slow

Rate limiter prevents spam but doesn't affect lag. If 40+ players in chat:
- Latency is still <100ms LAN latency (expected)
- If worse, check Wi-Fi signal strength on host machine

### Image loading (when image_guess is released) is slow

Enable compression:
```bash
npm run build  # Bundles and optimizes images
```

---

## Still stuck?

[Open an issue](https://github.com/Unknownbeliek/localflux/issues/new) and include the following information so we can reproduce the problem:

- Node.js version: `node -v`
- npm version: `npm -v`
- Operating system and version
- The full error message from the browser console or server terminal
- Steps to reproduce the issue
