# Testing

LocalFlux server testing is Jest-based and runs fully offline.

---

## Commands

From `server/`:

```bash
npm test
npm run test:watch
npm run test:coverage
```

From repo root:

```bash
npm test --prefix server
npm run test:coverage --prefix server
```

---

## Current suite map

`server/tests/` currently includes:

- `answerValidation.test.js`
- `chatManager.test.js`
- `chatModeration.test.js`
- `deckApiShape.test.js`
- `deckLoader.test.js`
- `engine.test.js`
- `gameEngine.test.js`
- `handlers.test.js`
- `hostTokenManager.test.js`
- `roomStore.test.js`
- `roundFlow.test.js`
- `scoringEngine.test.js`
- `shuffle.test.js`
- `textNormalization.test.js`
- `typeGuessFlow.integration.test.js`
- `typeGuessHandlers.test.js`
- `typeGuessMatcher.test.js`

---

## What is covered

- Deck loading, normalization, API shape compatibility
- Room lifecycle and player state mutations
- Core game engine transitions and scoring side effects
- Round orchestration and timer/lock transitions
- Type-guess matching, validation, and integration flow
- Chat moderation, throttling, and mode behavior
- Host token lifecycle and authorization checks
- Utility correctness (`shuffle`, text normalization)

---

## Notes on scoring tests

Two scoring paths are validated today:

- Legacy positional scoring behavior used by `gameEngine` for MCQ path
- New breakdown scoring API used in type-guess path

This dual-path coverage is intentional until score unification is complete.

---

## Adding new tests

1. Place new files under `server/tests/`.
2. Keep tests deterministic (mock time/random where needed).
3. Reset shared in-memory state in `beforeEach` for room/chat/token modules.
4. Prefer module-level unit tests first, then add integration tests for cross-module behavior.

