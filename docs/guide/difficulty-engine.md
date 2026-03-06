# Difficulty Engine

> **Status: Planned** — not yet implemented.

This page describes the design for the Difficulty Engine — a per-session
scoring system with four modes that change how points are calculated.

---

## Modes

| Mode | Description |
|---|---|
| `easy` | Flat +100 pts for any correct answer, no time pressure |
| `normal` | Flat +100 pts — the current default |
| `speed` | Points scale with how fast the player answered relative to the time limit |
| `chaos` | Per-question multipliers drawn randomly (×1, ×2, or ×3) announced just before the question |

The mode is set when the host creates a room and cannot be changed mid-game.

---

## Scoring formulas

### `easy` / `normal`

```
score += 100  (if correct)
```

### `speed`

```
time_taken  = time_limit_ms - ms_remaining_when_answered
time_ratio  = 1 - (time_taken / time_limit_ms)   // 1.0 = instant, 0.0 = last second
score      += Math.round(50 + 50 * time_ratio)    // range: 50–100
```

This requires the server to track when each question was sent
(`room.questionStartedAt = Date.now()`) and compute the delta when
`submit_answer` arrives.

### `chaos`

At the start of each question, the server draws a multiplier:

```js
const MULTIPLIERS = [1, 1, 1, 2, 2, 3]; // weighted toward ×1
const multiplier = MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)];
```

The multiplier is included in the `next_question` payload so the host and
players see it before answering. The base score is still flat 100, multiplied:

```
score += 100 * multiplier  (if correct)
```

---

## Implementation plan

1. Add `difficulty: 'normal'` to the room shape in `roomStore.js`
2. Accept `difficulty` in the `create_room` handler
3. In `gameEngine.submitAnswer()`: branch on `room.difficulty` to pick the scoring formula
4. For `speed` mode: add `room.questionStartedAt` set in `startGame()` and `advanceQuestion()`
5. For `chaos` mode: add `room.currentMultiplier` drawn in `advanceQuestion()`, included in `next_question` payload
6. Expose a difficulty selector in `Host.jsx` setup screen
7. Show the multiplier badge in `Host.jsx` and `Player.jsx` question screen for `chaos` mode

---

## Files that will change

| File | Change |
|---|---|
| `server/core/roomStore.js` | `difficulty` field on room; `questionStartedAt`; `currentMultiplier` |
| `server/core/gameEngine.js` | Scoring branch in `submitAnswer()`; multiplier draw in `advanceQuestion()` |
| `server/network/handlers.js` | Accept `difficulty` in `create_room`; include `multiplier` in `next_question` |
| `client/src/components/Host.jsx` | Difficulty selector in setup phase; multiplier badge in question phase |
| `client/src/components/Player.jsx` | Multiplier badge in question phase |
| `server/tests/gameEngine.test.js` | Tests for speed scoring formula and chaos multiplier |
