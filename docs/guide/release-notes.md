# Release Notes

## v1.0.0 - March 17, 2026

First stable LocalFlux release: a self-hosted, LAN-first multiplayer quiz engine with realtime gameplay, host controls, deck tooling, and offline operation.

---

## What shipped

### Core gameplay
- Full round lifecycle with timed questions and server-driven transitions
- Host-controlled room lifecycle (create, start, next question, close room)
- Reconnect flows for both host and players with grace windows
- Per-round answer lock + transition events (`round:locked`, `round:transition`)

### Modes and validation
- Multiple-choice and type-guess question flows
- Host answer-mode override: `auto`, `multiple_choice`, `type_guess`
- Fuzzy type-guess validation via `typeGuessMatcher`
- Host-selectable game difficulty labels (`Easy`, `Normal`, `Hard`) applied to loaded slides

### Scoring
- Legacy MCQ scoring path remains active in `gameEngine.submitAnswer()`:
	- Time-sensitive points (`50..100`) plus streak bonuses
	- Pro mode wrong-answer penalty
- New scoring breakdown engine available and integrated for type-guess flow:
	- Difficulty base (`easy/medium/hard`)
	- Time bonus up to 500
	- Mode multipliers (`casual/moderate/pro`)

### Room capacity and admission
- Configurable room cap with server-side enforcement
- Hotspot-aware effective cap for unstable networks
- Clear `room_full` response payloads for UI handling

### Chat and moderation
- Chat modes: `FREE`, `RESTRICTED`, `OFF`
- Rate limiting, profanity checks, host mute/unmute, host announcements
- In-room chat history snapshot on join/resume

### Deck and content APIs
- Local deck listing/detail APIs
- Host deck injection (`host:set_deck`) with schema normalization
- Magic deck generation endpoints:
	- `GET /api/magic/open-trivia`
	- `POST /api/magic/tmdb`

### Infrastructure
- Server bind to `0.0.0.0` for LAN play
- Network info endpoint (`/api/network-info`)
- Host-auth-protected upload + chat-log download routes

### Testing
- Jest suites across engine, handlers, deck loading, chat, round flow, type guess, scoring, and token management
- Dedicated tests for reconnect behavior and edge-case normalization

---

## Known gaps after v1.0.0

- Full queue-based admission UI is not complete yet (current behavior is cap + reject)
- Legacy MCQ scoring and new breakdown scoring both exist; full unification is pending
- Some docs/screenshots are placeholders and being updated

---

## Quick run

```bash
git clone https://github.com/Unknownbeliek/localflux.git
cd localflux
npm install
cd server && npm install
cd ../client && npm install
npm run dev
```

---

## Support

- Docs: [/guide/what-is-localflux](/guide/what-is-localflux)
- Issues: <https://github.com/Unknownbeliek/localflux/issues>


