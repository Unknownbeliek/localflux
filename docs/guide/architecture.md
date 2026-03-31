# Architecture

An overview of how LocalFlux is structured so contributors can find their way around quickly.

---

## Directory layout

```
localflux/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── App.jsx          # Main app router and provider setup
│       ├── components/
│       │   ├── Host.jsx     # Host control panel (setup → lobby → quiz → results)
│       │   ├── Player.jsx   # Player mobile UI (join → answer → results)
│       │   ├── Chat.jsx     # In-game chat system (FREE/RESTRICTED/OFF modes)
│       │   ├── PingIndicator.jsx    # Network latency monitor
│       │   ├── CloudDeckCard.jsx    # Cloud/Deck Studio card display
│       │   └── LocalhostBouncer.jsx # Local dev routing
│       ├── host/            # Host-specific components (dashboard, lobby, game screens)
│       ├── pages/
│       │   ├── AdminDashboard.jsx  # Admin controls and monitoring
│       │   └── DeckStudio.jsx      # Deck editor (create, import, export)
│       ├── deckStudio/      # Deck Studio state and logic
│       │   ├── store.js     # Redux-like state
│       │   ├── db.js        # Local persistence
│       │   ├── schemas.js   # Validation schemas
│       │   └── cloudCatalog.js  # Cloud deck integration
│       ├── context/
│       │   └── HostTokenProvider.jsx # Host authentication context
│       ├── hooks/
│       │   └── usePing.js   # Latency detection hook
│       └── utils/
│           └── imageCompressor.js # WebP/image optimization
│
├── server/                  # Node.js + Socket.IO backend
│   ├── server.js            # Entry point — HTTP server, deck load, socket wiring
│   ├── config/
│   │   ├── scoringPolicy.js # Scoring multipliers and rules
│   │   └── typeGuessPolicy.js # Type Guess game mode config
│   ├── core/
│   │   ├── deckLoader.js    # Load deck JSON from disk, sanitize questions
│   │   ├── roomStore.js     # In-memory room CRUD + player management
│   │   ├── gameEngine.js    # Pure game logic — start, answer, advance
│   │   ├── answerValidation.js  # Answer matching and variant handling
│   │   ├── chatManager.js   # Chat moderation and rate limiting
│   │   ├── hostTokenManager.js # Host authentication tokens
│   │   ├── scoringEngine.js # Scoring calculations and multipliers
│   │   └── shuffle.js       # Fisher-Yates shuffle algorithm
│   ├── network/
│   │   ├── handlers.js      # Main socket event handlers
│   │   ├── typeGuessHandlers.js # Type Guess mode socket handlers
│   │   ├── roundFlow.js     # Round state machine
│   │   └── handlerUtils.js  # Helper functions for handlers
│   ├── services/
│   │   └── typeGuessMatcher.js # Fuzzy string matching for type answers
│   ├── data/
│   │   └── decks/           # Deck JSON files
│   │       ├── movie.json   # Default deck
│   │       └── *.json       # User-uploaded decks
│   └── tests/               # Jest unit tests
│
├── docs/                    # VitePress documentation
│   ├── .vitepress/
│   │   └── config.mts       # VitePress configuration
│   ├── guide/               # Documentation pages
│   ├── public/              # Static assets
│   └── index.md             # Home page
│
└── landing/                 # Landing page (separate Vite app)
    └── src/
        └── NetworkTopology.jsx # Visual network diagram
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
| `answerValidation.js` | Fuzzy-match and normalize player answers | No — pure functions |
| `chatManager.js` | Chat mode enforcement, rate limiting, moderation | Yes (mutates token buckets) |
| `hostTokenManager.js` | Generate and validate host authentication tokens | No — pure functions |
| `scoringEngine.js` | Apply difficulty modes and multipliers to scores | No — pure functions |
| `shuffle.js` | Fisher-Yates deck shuffling | No — pure functions |
| `network/handlers.js` | Wire socket events to core, broadcast results | Yes (socket.io) |
| `network/typeGuessHandlers.js` | Type Guess mode socket handlers | Yes (socket.io) |
| `server.js` | Bootstrap only | Yes (http, socket.io) |

---

## Game Modes

LocalFlux supports two primary game modes that can be mixed within a single deck:

### Standard Mode (Multiple Choice)
- Four answer options presented to players
- Players click/tap an option
- Server-side answer validation
- Questions tagged as `type: "text_only"` or `type: "image_guess"`

### Type Guess Mode
- Players type their answer as free text
- Server performs fuzzy matching against correct answer
- Supports answer variants/aliases defined in deck
- Questions tagged as `type: "typing"`
- Uses `typeGuessMatcher.js` for string normalization and matching

### Mode Switching
Hosts can override deck defaults in the lobby (see "Host Mode Policy Matrix" below):

| Mode | Standard MCQ | Type Guess |
|---|---|---|
| **Auto** | Uses deck settings | Uses deck settings |
| **Force 4 Options** | Enabled | Auto-generates distractors |
| **Force Type Guess** | Converting first option to answer | Enabled |

---

## Advanced Features

### Host Authentication
Each host session gets a secure token generated by `hostTokenManager.js`. This prevents:
- Players from impersonating the host
- Unauthorized room control commands

Tokens are passed in the `HostTokenProvider` React context and included in host-only socket events.

### Chat System
Implemented in `chatManager.js` with three modes:

| Mode | Behavior |
|---|---|
| **FREE** | Players send any text; server rate-limits (1 msg/2s) and filters profanity |
| **RESTRICTED** | Only pre-canned messages allowed; host approves options |
| **OFF** | Chat disabled entirely |

Features:
- Token-bucket rate limiter per socket
- Leo-profanity integration
- Mute/unmute individual players
- Configurable warning threshold before mute

### Scoring Policies
Defined in `config/scoringPolicy.js`, allows overriding default +100 flat scoring:

- **Base score**: Points for correctness
- **Time multiplier**: Bonus/penalty based on answer speed
- **Difficulty multiplier**: Scales per-question difficulty (Easy/Normal/Speed/Chaos modes)

### Answer Validation
`answerValidation.js` and `typeGuessMatcher.js` handle fuzzy matching:
- Configurable edit distance (Levenshtein)
- Case-insensitive and whitespace-normalized comparisons
- Support for deck-defined variants/aliases

### Deck Studio
Browser-based deck editor with:
- Local in-memory state management (`deckStudio/store.js`)
- CSV import and auto-mapping
- Client-side schema validation (`deckStudio/schemas.js`)
- Export to `.flux` JSON format
- Optional cloud deck catalog support

---

## Data flow — a single question round
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
