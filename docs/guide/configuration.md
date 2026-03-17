# Configuration

All configuration is done through environment variables. There is no config
file at runtime — just `.env` files that are loaded by Node.js (`server/`) and
Vite (`client/`).

## Server environment variables

Set these in `server/.env` or export them in your shell before starting the
server.

### `PORT`

| | |
|---|---|
| **Default** | `3000` |
| **Type** | integer |
| **Scope** | server |

The TCP port the HTTP + WebSocket server listens on.

```bash
# Start on a custom port
PORT=8080 npm run dev
```

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

Path to the deck JSON file that gets loaded on server start. The file must
conform to the [Deck Schema](/guide/deck-schema).

```bash
# Absolute path
DECK_PATH=/home/user/my-events/quiz-night.json npm run dev

# Relative path (relative to repo root, not server/)
DECK_PATH=data/decks/pub-trivia.json npm run dev
```

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

```env
PORT=3000
DECK_PATH=data/decks/movie.json
```

### `client/.env` (example)

```env
VITE_BACKEND_URL=http://localhost:3000
```

A `client/.env.example` file is included in the repository. Copy it on first
setup:

```bash
cp client/.env.example client/.env
```

---

## Environment variables at a glance

| Variable | File | Default | Purpose |
|---|---|---|---|
| `PORT` | `server/.env` | `3000` | Server listen port |
| `DECK_PATH` | `server/.env` | `data/decks/movie.json` | Deck JSON to load |
| `VITE_BACKEND_URL` | `client/.env` | auto-detected | Backend URL for Socket.io |
