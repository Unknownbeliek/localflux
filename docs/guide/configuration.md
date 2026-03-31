# Configuration

LocalFlux runtime config comes from environment variables plus a few server constants. This page reflects what is currently implemented.

## Server environment variables

Set these before running `server/server.js`.

### `PORT`

| Key | Value |
|---|---|
| Default | `3000` |
| Scope | Server HTTP + Socket.IO |

Main backend listen port.

### `CLIENT_PORT`

| Key | Value |
|---|---|
| Default | `5173` |
| Scope | Server network info + startup logs |

Used for printed LAN join hints and `/api/network-info` metadata.

### `DECK_PATH`

| Key | Value |
|---|---|
| Default | `data/decks/movie.json` |
| Scope | Deck loaded at server startup |

Accepts absolute path or repo-relative path.

### `DEFAULT_ROOM_MAX_PLAYERS`

| Key | Value |
|---|---|
| Default | `20` |
| Scope | Initial room capacity |

Applied when host creates a room and does not provide a value.

### `HARD_MAX_PLAYERS`

| Key | Value |
|---|---|
| Default | `250` |
| Scope | Upper bound clamp |

Server never allows room capacity above this value.

---

## Client environment variables

Set these in `client/.env`.

### `VITE_BACKEND_URL`

| Key | Value |
|---|---|
| Default | Runtime fallback to current hostname on port `3000` |
| Scope | Frontend socket/API target |

Examples:

- Local: `http://localhost:3000`
- LAN: `http://192.168.1.42:3000`
- Custom port: `http://192.168.1.42:8080`

Restart Vite after changing env values.

---

## Current `.env` examples

### `server/.env`

```bash
PORT=3000
CLIENT_PORT=5173
DECK_PATH=data/decks/movie.json
DEFAULT_ROOM_MAX_PLAYERS=20
HARD_MAX_PLAYERS=250
```

### `client/.env`

```bash
VITE_BACKEND_URL=http://localhost:3000
```

---

## Runtime constants (not env yet)

These are currently hardcoded in server modules:

- `HOTSPOT_MAX_PLAYERS = 10` in `server/network/handlers.js`
- `HOST_RECONNECT_GRACE_MS = 45000`
- `PLAYER_RECONNECT_GRACE_MS = 45000`
- Round timing constants (`ROUND_LOCK_DELAY_MS`, `ROUND_TRANSITION_DELAY_MS`)

---

## Host-controlled room settings

These are set through socket events during lobby phase:

- `host:set_answer_mode` -> `auto | multiple_choice | type_guess`
- `host:set_question_timer` -> one of `5,10,15,...,60` seconds
- `host:set_game_difficulty` -> `Easy | Normal | Hard`
- `host:set_max_players`

When deck slides are loaded, timer and difficulty selections are applied server-side to the active question set.

---

## Chat configuration snapshot

Chat manager currently starts with:

- `tokenRefillMs: 1200`
- `tokenCap: 3`
- Modes: `FREE | RESTRICTED | OFF`

Host can switch chat mode with `chat:host_set_mode` and provide custom allowed canned messages for `RESTRICTED` mode.
