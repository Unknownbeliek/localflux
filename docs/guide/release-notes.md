# Release Notes

## v1.0.0 — March 17, 2026

The first stable release of LocalFlux. Everything labelled "planned" in the
pre-release builds is now shipped, tested, and documented.

### What's new

#### Core game engine
- Full quiz loop: questions → player answers → reveal → leaderboard → game over
- Server-authoritative scoring (+100 pts per correct answer, validated server-side)
- Per-question timer with configurable time limits in the deck JSON
- 4-digit PIN room system — host creates a room, players join by name + PIN
- Live lobby: host sees players appear in real time as they join

#### Deck system
- JSON deck format with `text_only` and `image_guess` question types
- Per-question `timeLimit` override
- Fuzzy-match answer variants (`variants` array in deck JSON)
- `DECK_PATH` env var to load any deck file at start-up
- Bundled `movie.json` deck (50 questions) for instant play

#### Deck Studio
- Browser-based deck editor — create, edit, and delete cards in the UI
- CSV import with automatic mapping and validation
- Client-side deck validation (schema + required fields)
- Export to `.flux` format (JSON download)

#### In-room chat
- Real-time chat for all players during the game
- Three host-controlled chat modes: **Open**, **Guided** (host must approve
  messages), **Silent** (chat disabled)
- Moderation controls: mute individual players, clear chat history

#### Session recovery
- Host and player reconnect gracefully after accidental refresh or brief disconnect
- In-progress game state is preserved in server RAM and restored on reconnect

### Quality / testing
- 48 Jest unit tests covering game engine, room store, deck loader, chat manager,
  and chat moderation
- Zero external runtime dependencies beyond Node.js standard library and Socket.io

### Infrastructure
- Node.js + Express + Socket.io backend
- React 19 + Vite + Tailwind CSS v4 frontend
- No database, no cloud account, no Docker required

---

### Breaking changes from pre-release builds

There were no public pre-release tags. `v1.0.0` is the base.

---

## Upcoming

The following features are designed and documented but not yet implemented:

| Feature | Description | Doc |
|---|---|---|
| **VIP Bouncer** | Connection queue with soft/hard player caps | [→](/guide/vip-bounce) |
| **Difficulty Engine** | Per-question scoring multipliers and time pressure | [→](/guide/difficulty-engine) |
| **Accolades** | Post-game achievement badges | — |

---

## Version history

| Version | Date | Notes |
|---|---|---|
| `v1.0.0` | 2026-03-17 | First stable release |
