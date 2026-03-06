# Testing

This guide explains the test setup, how to run tests, and what each suite covers.

---

## Stack

| Tool | Role |
|---|---|
| [Jest](https://jestjs.io) | Test runner + assertion library |
| Node.js built-ins | `fs`, `os`, `path` — used for temp deck fixtures |

No network calls, no sockets, no browser APIs are needed. All tests are pure unit tests that run offline in milliseconds.

---

## Running tests

All commands run from the `server/` directory:

```bash
# Run all tests once
npm test

# Re-run on file changes (development)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

Tests are configured via the `"jest"` key in `server/package.json`:

```json
"jest": {
  "testEnvironment": "node",
  "testMatch": ["**/tests/**/*.test.js"]
}
```

---

## Test files

```
server/tests/
├── deckLoader.test.js   — file loading and question sanitization
├── roomStore.test.js    — in-memory room + player state management
└── gameEngine.test.js   — game logic: start, answer scoring, question advance
```

---

## `deckLoader.test.js`

Tests for `server/core/deckLoader.js`.

### `loadDeck()`

| Test | What it checks |
|---|---|
| loads a valid deck | Returns an object with a `questions` array |
| file not found | Throws `"Deck not found"` |
| missing `questions` key | Throws with `"questions" array` message |
| `questions` is not an array | Same error as above |

Temporary deck files are written to `os.tmpdir()` and deleted after each test.

### `sanitizeQuestion()`

| Test | What it checks |
|---|---|
| removes `correct_answer` | Field absent from returned object |
| removes `fuzzy_allowances` | Field absent from returned object |
| preserves other fields | `q_id`, `prompt`, `options`, `time_limit_ms` all intact |
| does not mutate original | Source object still has `correct_answer` after call |

---

## `roomStore.test.js`

Tests for `server/core/roomStore.js`.  
The shared `rooms` map is wiped in a `beforeEach` block so tests are fully isolated.

### `createRoom()`

| Test | What it checks |
|---|---|
| returns 4-digit PIN | Result matches `/^\d{4}$/` |
| correct initial shape | `status: 'lobby'`, `currentQ: -1`, empty players, empty `answersIn` |
| unique PINs | 10 concurrent rooms produce 10 distinct PINs |

### `getRoom()`

| Test | What it checks |
|---|---|
| valid PIN | Returns room object |
| unknown PIN | Returns `undefined` |

### `deleteRoom()`

| Test | What it checks |
|---|---|
| removes room | `getRoom()` returns `undefined` afterwards |
| no-op on missing PIN | Does not throw |

### `addPlayer()`

| Test | What it checks |
|---|---|
| adds player with `score: 0` | Player present with correct shape |
| returns `true` for new player | Return value |
| rejects duplicate | Returns `false`, list length unchanged |
| returns `false` for unknown PIN | Graceful failure |

### `removePlayer()`

| Test | What it checks |
|---|---|
| removes player, returns PIN | Player gone from list |
| unknown socket → `null` | No error, returns `null` |

### `findHostPin()`

| Test | What it checks |
|---|---|
| returns PIN of host's room | Correct PIN |
| non-host socket → `null` | Returns `null` |

---

## `gameEngine.test.js`

Tests for `server/core/gameEngine.js`.  
Each test builds its own room + questions fixture; no shared state.

### `startGame()`

| Test | What it checks |
|---|---|
| sets status to `started` | `room.status === 'started'` |
| sets `currentQ` to 0 | `room.currentQ === 0` |
| returns sanitized Q + index + total | `correct_answer` absent, `index: 0` |
| resets `answersIn` | Empty object after call |
| throws with no players | Error message contains "at least one player" |
| throws when already started | Error message contains "already in progress" |

### `submitAnswer()`

| Test | What it checks |
|---|---|
| awards 100 pts for correct answer | `player.score === 100` |
| no points for wrong answer | `player.score === 0` |
| `correct: true` returned | Return value |
| `correct: false` for wrong | Return value |
| rejects duplicate answer | `alreadyAnswered: true`, score not doubled |
| tracks answer count | Count increments per unique submission |
| no-op when game not started | Returns with `answerCount: 0` |

### `advanceQuestion()`

| Test | What it checks |
|---|---|
| `result` contains `correct_answer` | Matches source question |
| `result` contains current scores | All players represented |
| increments `currentQ` | `+1` after call |
| resets `answersIn` | Empty object after call |
| returns `next` (not null) when more Q remain | `next.index`, `next.total`, no `correct_answer` |
| sets `finished` + returns `gameOver` on last Q | `room.status`, `next === null`, `gameOver !== null` |
| sorts final scores descending | Highest scorer is `gameOver.scores[0]` |
| throws when game not in progress | Error contains "not in progress" |

---

## Writing new tests

1. Create a file in `server/tests/` named `<module>.test.js`
2. Use `beforeEach` to reset any shared module-level state (especially `roomStore.rooms`)
3. Keep each test focused on a single behaviour — one `expect` per logical assertion is ideal
4. Avoid touching the file system or network unless testing code that explicitly does so
5. If you need a real deck object, use the `writeTempDeck` pattern from `deckLoader.test.js`

---

## Coverage

Run `npm run test:coverage` to generate an HTML report in `server/coverage/`.  
The goal is **≥ 90 % line coverage** on all files in `server/core/`.
