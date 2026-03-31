# Difficulty Engine

> **Status: Partially Implemented**

LocalFlux currently supports host-set difficulty labels (`Easy`, `Normal`, `Hard`) that are applied to active slides in lobby. Advanced modes like Speed/Chaos are still planned.

---

## What exists today

| Setting | Allowed values | Effect |
|---|---|---|
| Room game difficulty | `Easy`, `Normal`, `Hard` | Server rewrites slide `difficulty` during deck apply/update |
| Host game mode | `casual`, `moderate`/`arcade`, `pro` | Influences validation/scoring behavior depending on answer path |

Difficulty changes are lobby-only (`room_not_lobby` guard in handlers).

---

## Current scoring behavior

### MCQ path (legacy runtime)

`gameEngine.submitAnswer()` currently calls the backward-compatible positional scoring API:

- Correct answers: time-sensitive points in approximately `50..100`
- Streak bonus: incremental bonus by streak length
- Wrong in pro mode: negative penalty

### Type-guess path (new breakdown runtime)

`typeGuessHandlers` uses the object-based scoring API:

$$
	ext{finalScore} = \lfloor (\text{baseScore} + \text{timeBonus}) \times \text{multiplier} \rfloor
$$

with base by difficulty (`easy/medium/hard`) and mode-dependent multipliers.

This path is active for type-guess submissions.

## Planned modes (not implemented)

- Speed mode
- Chaos multipliers
- Round-level multiplier broadcast UI

---

## Lobby difficulty update flow

1. Host sends `host:set_game_difficulty`
2. Server validates `Easy | Normal | Hard`
3. Room setting is stored in `room.gameDifficulty`
4. Existing loaded slides are re-written through `applyRoomSettingsToSlides`

---

## Related files

| File | Role |
|---|---|
| `server/network/handlers.js` | Difficulty event handling + slide re-apply |
| `server/core/roomStore.js` | Room default (`gameDifficulty: 'Normal'`) |
| `server/core/scoringEngine.js` | Legacy and object scoring APIs |
| `server/core/gameEngine.js` | Legacy MCQ score application |
| `server/network/typeGuessHandlers.js` | Object scoring usage for type-guess |
