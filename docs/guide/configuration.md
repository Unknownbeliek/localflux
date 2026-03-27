# Configuration

All runtime configuration is provided through environment variables. There is no configuration file to edit at runtime — only `.env` files loaded by Node.js (`server/`) and Vite (`client/`). This page documents every supported variable, its default value, and when to change it.

## Server environment variables

Set these in `server/.env`, or pass them inline when starting the server. Values in `server/.env` take effect automatically when the server starts.

### `PORT`

| | |
|---|---|
| **Default** | `3000` |
| **Type** | integer |
| **Scope** | server |

The TCP port the HTTP + WebSocket server listens on.

::: code-group

```bash [macOS / Linux]
# Pass inline
PORT=8080 npm run dev

# Or add to server/.env
echo "PORT=8080" >> server/.env
```

```powershell [Windows]
# Pass inline (current session only)
$env:PORT=8080; npm run dev

# Or add to server/.env
Add-Content server\.env "PORT=8080"
```

:::

::: warning Update the client too
If you change `PORT`, update `VITE_BACKEND_URL` in `client/.env` to match —
otherwise the client will still try to connect on 3000.
:::

---

### `DECK_PATH`

| | |
|---|---|
| **Default** | `data/decks/movie.json` (resolved relative to the repo root) |
| **Type** | file path (absolute or relative to the repo root) |
| **Scope** | server |

Path to the deck JSON file that gets loaded on server start. The file must conform to the [Deck Schema](/guide/deck-schema).

::: code-group

```bash [macOS / Linux]
# Absolute path
DECK_PATH=/home/user/events/quiz-night.json npm run dev

# Path relative to the repo root
DECK_PATH=data/decks/pub-trivia.json npm run dev
```

```powershell [Windows]
# Absolute path
$env:DECK_PATH="C:\Users\User\events\quiz-night.json"; npm run dev

# Path relative to the repo root
$env:DECK_PATH="data\decks\pub-trivia.json"; npm run dev
```

:::

::: tip Multiple decks
Only one deck is loaded per server instance. To switch decks, restart the
server with a different `DECK_PATH`. Deck hot-reload is on the roadmap.
:::

---

## Client environment variables

Set these in `client/.env`. Vite reads `.env` files at **build time** — restart
`npm run dev` after any change.

### `VITE_BACKEND_URL`

| | |
|---|---|
| **Default** | `http://<window.location.hostname>:3000` (auto-detected at runtime) |
| **Type** | URL string |
| **Scope** | client (Vite) |

The full URL of the LocalFlux backend. Used by `client/src/backendUrl.js` to
resolve the Socket.io connection target.

**When to set it explicitly:**

| Scenario | Value |
|---|---|
| Local dev (same machine) | `http://localhost:3000` |
| LAN event (players on other devices) | `http://192.168.1.42:3000` — your machine's LAN IP |
| GitHub Codespaces | Your forwarded port URL, e.g. `https://xxx-3000.app.github.dev` |
| Custom port | `http://localhost:8080` |

**Auto-detection fallback:**

When `VITE_BACKEND_URL` is not set, the client falls back to:

```
<protocol>//<hostname>:3000
```

This means the app automatically connects to port 3000 on whatever host served
the frontend. For a LAN event where both server and client are served from the
host machine, this often works without any config — players just open the
frontend URL and the socket connects automatically.

---

## `.env` file reference

### `server/.env` (example)

```bash
PORT=3000
DECK_PATH=data/decks/movie.json
```

### `client/.env` (example)

```bash
VITE_BACKEND_URL=http://localhost:3000
```

A `client/.env.example` file is included in the repository. Copy it on first setup:

::: code-group

```bash [macOS / Linux]
cp client/.env.example client/.env
```

```powershell [Windows]
copy client\.env.example client\.env
```

:::

---

## Environment variables at a glance

| Variable | File | Default | Purpose |
|---|---|---|---|
| `PORT` | `server/.env` | `3000` | Server listen port |
| `DECK_PATH` | `server/.env` | `data/decks/movie.json` | Deck JSON to load |
| `VITE_BACKEND_URL` | `client/.env` | auto-detected | Backend URL for Socket.io |
| `NODE_ENV` | `server/.env` | `development` | Runtime mode (development/production) |

---

## Advanced Configuration

### Server-side (Node.js only)

#### `NODE_ENV`

| | |
|---|---|
| **Default** | `development` |
| **Type** | string |
| **Values** | `development`, `production` |

Controls logging verbosity and error handling:
- **development**: Verbose logs, detailed error messages
- **production**: Minimal logging, error details hidden from clients

```bash
NODE_ENV=production npm run dev
```

---

### Game Room Settings

These are configured programmatically when a host creates a room, not via environment variables.

#### Room Configuration Object (Host sets in UI)

```javascript
{
  gameMode: "auto",           // "auto" | "force-mcq" | "force-type-guess"
  difficulty: "normal",       // "easy" | "normal" | "speed" | "chaos"
  chatMode: "free",           // "free" | "restricted" | "off"
  timerEnabled: true,         // Show countdown timer
  scoreVisibility: "public"   // "public" | "host-only"
}
```

Hosts configure these when creating a room in the UI. See [Game Modes](/guide/game-modes) and [Chat Guide](/guide/chat) for details.

---

### Scoring & Difficulty

Scoring multipliers are defined in `server/config/scoringPolicy.js`:

```javascript
{
  baseScore: 100,              // Points per correct answer
  speedBonus: 50,              // Max bonus in Speed mode
  easyMultiplier: 0.5,         // Reduce difficulty
  normalMultiplier: 1.0,       // Default
  speedDifficulty: "hard",     // Speed mode is harder for players
  chaosMultipliers: [1, 1, 1, 2, 2, 3]  // Weighted random multipliers
}
```

To customize scoring, edit `server/config/scoringPolicy.js` before starting the server.

---

### Type Guess Matching

Fuzzy matching rules are in `server/config/typeGuessPolicy.js`:

```javascript
{
  maxEditDistance: 2,          // Levenshtein distance tolerance
  caseSensitive: false,        // Convert both to lowercase
  trimWhitespace: true,        // Remove leading/trailing spaces
  enableSubstringMatch: false  // Allow "paris" to match "paris france"
}
```

To adjust fuzzy matching strictness, edit this file.

---

### Chat System Configuration

Chat settings are defined in `server/core/chatManager.js`:

| Setting | Default | Purpose |
|---|---|---|
| `tokenCapacity` | `1` | Max messages per token bucket |
| `tokenRefillMs` | `2000` | Milliseconds per token refill (1 msg / 2s) |
| `maxWarnings` | `3` | Warnings before mute |
| `staleEntryMs` | `600000` | Cleanup stale bucket entries (10 min) |

Hosts can switch between chat modes in the lobby UI:
- **FREE**: Rate-limited, profanity-filtered
- **RESTRICTED**: Pre-canned messages only
- **OFF**: Chat disabled

---

### VIP Bouncer (Planned)

ConnectionQueue system (not yet implemented) will support:

```javascript
{
  softCap: 40,        // Normal connections below this
  hardCap: 50,        // Queue new connections above this
  queueTimeout: 300000 // 5 minutes max wait in queue
}
```

When implemented, these will be configurable via `VIP_SOFT_CAP` and `VIP_HARD_CAP` environment variables.

---

## Deployment Scenarios

### Development (Local Machine)

```bash
# server/.env
PORT=3000
DECK_PATH=data/decks/movie.json
NODE_ENV=development

# client/.env
VITE_BACKEND_URL=http://localhost:3000
```

Run both from the repo root:

```bash
npm run dev
```

---

### LAN Event (Multiple Devices)

Find your LAN IP, then update the client:

::: code-group

```bash [macOS]
ipconfig getifaddr en0
```

```bash [Linux]
ip route get 1 | awk '{print $7; exit}'
```

```powershell [Windows]
ipconfig | findstr /i "IPv4"
```

:::

```bash
# server/.env
PORT=3000
DECK_PATH=data/decks/event-quiz.json

# client/.env
VITE_BACKEND_URL=http://192.168.1.42:3000
```

Restart the Vite dev server after changing `client/.env`.

---

### Production (Static Build)

For a stable, single-binary deployment:

```bash
# Build the client
cd client && npm run build

# Serve from Express
# Add to server.js (before socket setup):
app.use(express.static(path.join(__dirname, '../client/dist')));
```

Then start only the server:

```bash
cd server && npm run dev
```

The frontend HTML is now served directly from the backend, so you only manage one port.

---

## Configuration Checklist

- [ ] **Port**: Set `PORT` if 3000 is unavailable
- [ ] **Deck**: Point `DECK_PATH` to your trivia file
- [ ] **Backend URL**: Set `VITE_BACKEND_URL` if running on LAN or custom port
- [ ] **Firewall**: Open ports 3000 (server) and 5173 (client dev) if on LAN
- [ ] **Game settings**: Configure Room options (mode, difficulty, chat) in the Host UI before starting
- [ ] **Scoring**: Adjust `scoringPolicy.js` if wanted
- [ ] **Type Guess**: Tune `typeGuessPolicy.js` for answer matching sensitivity
