# Architecture

An overview of how LocalFlux is structured so contributors can find their way around quickly.

---

## Directory layout

```
foss-hack-quiz-engine/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── Host.jsx     # Host control panel (setup → lobby → quiz → results)
│       │   └── Player.jsx   # Player mobile UI (join → answer → results)
│       └── pages/
│           └── Home.jsx     # Landing page — HOST / JOIN buttons
│
├── server/                  # Node.js + Socket.IO backend
│   ├── server.js            # Entry point — HTTP server, deck load, socket wiring
│   ├── core/
│   │   ├── deckLoader.js    # Load deck JSON from disk, sanitize questions
│   │   ├── roomStore.js     # In-memory room CRUD + player management
│   │   └── gameEngine.js    # Pure game logic — start, answer, advance
│   ├── network/
│   │   └── handlers.js      # Socket event handlers (thin wiring layer)
│   └── tests/               # Jest unit tests (see testing.md)
│
└── data/
    └── decks/
        └── movie.json       # Default quiz deck (Hollywood Blockbusters)
```

---

## Layers

LocalFlux uses a strict three-layer server architecture so contributors can work on one concern without touching the others.

```
┌──────────────────────────────────────────────────┐
│  server.js                                       │
│  Entry point. Boots HTTP, loads deck, opens      │
│  socket connection, calls registerHandlers().    │
└───────────────┬──────────────────────────────────┘
                │ passes (socket, io, questions)
┌───────────────▼──────────────────────────────────┐
│  network/handlers.js                             │
│  One function per socket event. Validates input, │
│  calls core, then broadcasts the results via io. │
└───────────────┬──────────────────────────────────┘
                │ calls
┌───────────────▼──────────────────────────────────┐
│  core/                                           │
│  ┌─────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ deckLoader  │  │ roomStore  │  │gameEngine │ │
│  │ (file I/O)  │  │ (state)    │  │ (logic)   │ │
│  └─────────────┘  └────────────┘  └───────────┘ │
└──────────────────────────────────────────────────┘
```

| Module | Responsibility | Has side effects? |
|---|---|---|
| `deckLoader.js` | Read JSON from disk, expose `sanitizeQuestion` | Yes (fs) — runs once at startup |
| `roomStore.js` | CRUD on the in-memory `rooms` map | Yes (mutates state) |
| `gameEngine.js` | Start game, score answers, advance questions | **No** — pure functions on room objects |
| `network/handlers.js` | Wire socket events to core, broadcast results | Yes (socket.io) |
| `server.js` | Bootstrap only | Yes (http, socket.io) |

---

## Data flow — a single question round

```
Host clicks START
  → client emits start_game { pin }
    → handlers.js validates host ownership
      → gameEngine.startGame() mutates room, returns first question
        → handlers broadcasts game_started + next_question to room

Players receive next_question
  → Player taps an answer
    → client emits submit_answer { pin, answer }
      → handlers.js calls gameEngine.submitAnswer()
        → score is updated in roomStore
        → callback tells the player correct/wrong
        → answer_count emitted to host

Host clicks REVEAL ANSWER
  → client emits next_question { pin }
    → handlers.js calls gameEngine.advanceQuestion()
      → question_result emitted to everyone (correct answer + scores)
      → if more questions remain: next_question emitted
      → if last question: game_over emitted, room deleted
```

---

## State machine — room `status`

```
lobby ──► started ──► finished
```

- **lobby**: Room created; players can join; game not started
- **started**: `startGame()` called; `submit_answer` and `next_question` are accepted
- **finished**: `advanceQuestion()` ran out of questions; room is deleted immediately after `game_over` is emitted

---

## State Shapes (Host vs. Player)

To enforce a "Dumb Client" anti-cheat architecture, the server never sends the actual answer to players before the round concludes. 

### ServerGameState
Held strictly in RAM (`core/roomStore.js`).
```javascript
{
  roomId: "ABCD",
  status: "started",
  currentQuestionIndex: 2,
  currentTimer: 15,
  correctAnswer: "Paris", // NEVER sent to player payload during active round
  playerScores: {
    "socket_123": 1500,
    "socket_456": 800
  }
}
```

### PlayerPayload
Sent to all mobile clients during a live round.
```javascript
{
  roomId: "ABCD",
  status: "started",
  currentQuestionIndex: 2
  // CORRECT ANSWER IS DELIBERATELY EXCLUDED
}
```

---

## Host Mode Policy Matrix

LocalFlux handles mixed-content decks (MCQ + Typing) gracefully. Hosts can override the deck's default mechanics from the lobby.

| Mode | Behavior | Validation Safety |
|---|---|---|
| **Auto (Deck-Driven)** | Respects deck settings. `mcq` and `typing` questions run exactly as authored. | None (Default mode) |
| **Force 4 Options** | `mcq` runs normally. `typing` auto-generates 3 distractors dynamically. | UI warns host if distractor generation fails threshold. Host can fallback or block. |
| **Force Type Guess** | `typing` runs normally. `mcq` converts the correct option into the accepted typing answer. | None |

---

## Adding a new socket event

1. Write the pure logic in `core/gameEngine.js` (or `core/roomStore.js` if it's state management)
2. Add the handler in `network/handlers.js` inside `registerHandlers()`
3. Add a unit test in `server/tests/`
4. React to the new event in `Host.jsx` and/or `Player.jsx`

---

## LAN / local-network play

- The server binds to `0.0.0.0` so it is reachable from every device on the network
- The client builds its Socket.IO URL from `window.location.hostname` (never hardcoded `localhost`)
- Vite's dev server also binds to `0.0.0.0` (`server.host` in `vite.config.js`)
- Players visit `http://<host-machine-ip>:5173` on their phones

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the game server listens on |
| `DECK_PATH` | `data/decks/movie.json` | Absolute path to a deck JSON file |
