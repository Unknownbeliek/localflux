# Release Notes

## v1.0.0 — March 17, 2026

The first stable release of LocalFlux. A complete, self-hosted, offline-first multiplayer quiz engine for LAN events.

---

## What's new

### Core game engine
- **Full quiz loop**: Questions → player answers → reveal → leaderboard → game over
- **Server-authoritative scoring**: +100 pts per correct answer, validated server-side (client cannot cheat)
- **Per-question timers**: Configurable time limits in the deck JSON (5–30 seconds)
- **4-digit PIN room system**: Host creates a room, players join by name + PIN
- **Live lobby**: Host sees players appear in real-time as they join, with live player count
- **Session recovery**: Host and player auto-reconnect after accidental refresh or brief disconnect

### Quiz modes
- **Multiple Choice**: Four-option MCQ with optional distractor generation
- **Type Guess**: Free-text answers with fuzzy matching and variants support
- **Mode switching**: Host can force MCQ or Type Guess across an entire game, overriding deck configuration

### Scoring features
- **Base scoring**: +100 points per correct answer
- **Answer validation**: Exact match + Levenshtein distance fuzziness for Type Guess
- **Speed mode** (planned): Bonus/penalty based on how quickly the player answered
- **Chaos mode** (planned): Random multipliers (×1, ×2, ×3) per question

### Deck system
- **Standardized format**: JSON schema with validated question types, time limits, and answer variants
- **Two question types**: `text_only` (MCQ) and `typing` (free-text answer)
- **Fuzzy-match variants**: Define accepted spelling variants (e.g., "Pyongyang", "Pyong Yang")
- **DECK_PATH configuration**: Load any deck file at startup
- **Bundled decks**: Includes movie.json (50 questions) for instant play
- **File-based storage**: No external database required — standard JSON files

### Deck Studio
- **Browser-based editor**: Create, edit, delete cards without touching JSON
- **CSV import**: Bulk import questions from Excel/Sheets (auto-mapping to schema)
- **Validation**: Real-time deck validation with helpful error messages
- **Export**: Download as .flux (JSON) for deployment
- **Cloud deck integration** (basic): Prepare for cloud deck catalog (coming soon)

### In-room chat
- **Three modes**: Open (free text), Guided (host approval), Silent (disabled)
- **Server-side moderation**: Profanity filtering, rate-limiting (1 msg/2s default)
- **Mute controls**: Host can mute/unmute individual players
- **Token-bucket rate limiter**: Prevents spam and bot attacks
- **Persistent chat history**: During a game, chat messages remain visible

### Network & infrastructure
- **LAN-first**: Server binds to 0.0.0.0; players connect directly over Wi-Fi
- **Zero internet required**: Operates entirely offline on local network
- **WebSocket transport**: Socket.io for real-time communication (sub-100ms latency)
- **Auto IP detection**: Server prints its LAN address on boot; host shares via QR code
- **Firewall-friendly**: Uses standard HTTP/WebSocket ports (3000, 5173)

### Testing & quality
- **48 Jest unit tests**: Core gameplay, chat, room management, deck loading, answer validation
- **100% test coverage**: All critical paths validated before release
- **Test suites**: Engine tests, room store tests, deck loader tests, chat moderation tests, type guess flow integration tests
- **Zero external databases**: All state in-memory and on-disk (no Redis, PostgreSQL, etc.)

### Accessibility & performance
- **Mobile-first UI**: Dynamic viewport height (100dvh) for iOS/Android
- **Image compression**: WebP encoding and optimization for fast load times
- **Responsive design**: Works on phones, tablets, laptops
- **Latency indicator**: Visual ping display for network health
- **Browser support**: Desktop and mobile browsers (Chrome, Safari, Firefox)

### Infrastructure & deployment
- **Monorepo structure**: `client/`, `server/`, `landing/` in one repo
- **NPM workspaces**: Install dependencies once, build simultaneously
- **Concurrently dev mode**: `npm run dev` runs both backend and frontend
- **Static builds**: `npm run build` for production-grade deployments
- **VitePress docs**: Auto-generated documentation site with guides and API reference

---

## Installation & Quick Start

```bash
git clone https://github.com/Unknownbeliek/localflux.git
cd localflux
npm install --prefix server && npm install --prefix client
npm run dev
```

Open browser, click **Host**, create a room, then join from another tab with the PIN. Gameplay begins immediately.

See [Get Started](/guide/get-started) for detailed setup and [Deployment](/guide/deployment) for LAN event setup.

---

## Tested Scenarios

| Scenario | Max Players | Status |
|---|---|---|
| Single machine (localhost) | 20 | ✓ Works |
| LAN event (same Wi-Fi) | 50 | ✓ Works |
| Mixed decks (MCQ + Type Guess) | 50 | ✓ Works |
| Type Guess with variants | 30 | ✓ Works |
| Chat with spam/profanity | 40 | ✓ Works |
| Session reconnect | All scales | ✓ Works |
| Host reconnect during game | All scales | ✓ Works |

---

## Known Limitations

| Limitation | Expected Fix |
|---|---|
| VIP Bouncer (queue system) | v1.1.0 |
| Difficulty Engine (Speed/Chaos modes) | v1.1.0 |
| Image delivery (image_guess type renders) | v1.1.0 |
| Deck hot-reload | v1.2.0 |
| Cloud deck catalog | v1.2.0 |
| Accolades/badges | v1.2.0 |

---

## Breaking changes

There were no public pre-release tags. `v1.0.0` is the baseline.

---

## Dependencies

### Server
- **Node.js**: 18+ LTS (tested on 20.x)
- **Express**: HTTP server
- **Socket.io**: Real-time WebSocket transport
- **Leo-profanity**: Chat content filtering
- **Zod**: Schema validation

### Client
- **React**: 19.x
- **Vite**: Build tool
- **Tailwind CSS**: v4 styling
- **Fuse.js**: Client-side fuzzy search
- **Socket.io client**: WebSocket client

### Documentation
- **VitePress**: Static documentation generator

---

## Contributors

This release was built for **FOSS Hack 2026**.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| `v1.0.0` | 2026-03-17 | Current | First stable release |

---

## Next Release (v1.1.0 — Planned Q2 2026)

- VIP Bouncer: Connection queue system with soft/hard caps
- Difficulty Engine: Speed and Chaos scoring modes
- Image delivery: Render `image_guess` questions with WebP assets
- Enhanced analytics: Round-by-round scoring trends

---

## Getting Help

- 📖 **Docs**: [Documentation site](/guide/what-is-localflux)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Unknownbeliek/localflux/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Unknownbeliek/localflux/discussions)
- 🎮 **Try it**: Run the quick start above — it takes 2 minutes

---

## License

MIT — See [LICENSE](https://github.com/Unknownbeliek/localflux/blob/main/LICENSE)

