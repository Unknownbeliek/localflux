# Contributing

Thank you for your interest in contributing to LocalFlux! This document covers
everything you need to know before opening a pull request.

## Getting the code running

Follow the [Get Started](/guide/get-started) guide to set up a local
development environment.

Run the test suite before making any changes to confirm a clean baseline:

```bash
npm test --prefix server
```

All 48 tests should pass.

---

## Branching

| Branch | Purpose |
|---|---|
| `main` | Stable, releasable code. Direct pushes only for maintainers. |
| `feat/<name>` | New features — branched from `main` |
| `fix/<name>` | Bug fixes — branched from `main` |
| `docs/<name>` | Documentation-only changes — branched from `main` |
| `chore/<name>` | Tooling, deps, config — branched from `main` |

### Workflow

```bash
# Start a new feature
git checkout main && git pull
git checkout -b feat/your-feature-name

# ... make changes, commit often ...

# Push and open a PR
git push -u origin feat/your-feature-name
```

Keep branches short-lived. Rebase on `main` before opening a PR if your branch
has fallen behind.

---

## Commit format

LocalFlux uses **Conventional Commits** (`type(scope): description`).

### Types

| Type | When to use |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `test` | Adding or updating tests (no production code change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Build process, deps, CI, tooling |
| `release` | Version bumps and release commits |

### Scopes (optional but helpful)

`engine`, `chat`, `deck`, `client`, `server`, `docs`, `tests`

### Examples

```
feat(deck): support image_guess question type in Deck Studio
fix(engine): prevent double-scoring on reconnect during answer window
docs(get-started): add Quickstart in 60 seconds block
test(chat): add moderation tests for Guided mode
chore(deps): bump socket.io to 4.8.1
release: v1.1.0
```

### Rules

- Subject line is lowercase, no trailing period
- Limit the subject to 72 characters
- Use the imperative mood: "add" not "added", "fix" not "fixed"
- Reference issues in the footer: `Closes #42`

---

## Code style

### General

- No linter is enforced yet — just match the style of the surrounding code.
- Prefer `const` over `let`; avoid `var`.
- Use `'use strict'` at the top of every server module.
- Do not commit `console.log` debug statements.

### Server (Node.js)

- CommonJS modules (`require` / `module.exports`) — the server does not use ESM.
- Keep side-effect-free logic in `core/` and I/O / socket wiring in `server.js`
  / `network/handlers.js`.
- New server-side behaviour should have unit tests (see below).

### Client (React + Vite)

- ESM / JSX — import with ES module syntax.
- Components live in `client/src/components/`. Pages live in
  `client/src/pages/`.
- Keep components small. If a component exceeds ~150 lines, consider splitting it.

---

## Tests

LocalFlux uses **Jest** for all server-side tests. There is no client-side test
suite yet.

### Running tests

```bash
# All tests
npm test --prefix server

# Watch mode (re-runs on file change)
npm run test:watch --prefix server

# Single file
npx jest --testPathPattern=gameEngine --prefix server
```

### Test file location

Test files live alongside the code they test under `server/tests/`:

```
server/tests/
  chatManager.test.js
  chatModeration.test.js
  deckLoader.test.js
  gameEngine.test.js
  roomStore.test.js
```

### Expectations for new contributions

- Every new function in `core/` should have at least one happy-path test and one
  error/edge-case test.
- Bug fixes should include a regression test — a test that fails without the fix
  and passes with it.
- PRs that reduce test coverage will not be merged.
- Run `npm test --prefix server` before pushing — CI will also run it on every PR.

### Test philosophy

- Tests are unit tests — no network, no file system (mock `fs` where needed).
- Use the existing test files as a style reference.
- Test descriptions use plain English: `'returns null when room does not exist'`.

---

## Architecture and Module Guidelines

Before implementing a feature, understand the three-layer structure:

**Layer 1 — Core Logic** (`server/core/`)
- Pure functions with no side effects
- Examples: `gameEngine.js`, `answerValidation.js`, `shuffle.js`
- **Test every public function**

**Layer 2 — Socket Wiring** (`server/network/`)
- Thin adapters between Socket.io and core logic
- Examples: `handlers.js`, `typeGuessHandlers.js`
- **Do NOT put complex logic here — call core/ instead**

**Layer 3 — Bootstrap** (`server/server.js`)
- HTTP/Socket.io initialization only
- **Minimal business logic**

### Adding a new game mechanic

1. Write pure logic in `core/gameEngine.js` or a new `core/myFeature.js`
2. Write tests in `server/tests/myFeature.test.js`
3. Wire it in `network/handlers.js` or `network/myFeatureHandlers.js`
4. Update React components (`client/src/components/`) to react to new events
5. Document the feature in [docs/guide/](/guide/get-started)

### Adding a new socket event

1. Define the core logic (pure function) in `core/`
2. Add the handler function in `network/handlers.js` or a new file
3. Emit the event with `io.to(roomId).emit('event_name', payload)`
4. Add a test for the handler logic
5. Update the client to listen for the event:
   ```javascript
   socket.on('event_name', (payload) => { /* react */ });
   ```

---

## Client-side development

### Component structure

```
client/src/
├── components/
│   ├── Host.jsx           # Host control panel (stateful, orchestrates UI flows)
│   ├── Player.jsx         # Player join/answer screen
│   ├── Chat.jsx           # Chat system reusable component
│   ├── host/              # Host sub-components (detailed dashboard screens)
│   └── [other-feature]/
├── pages/
│   ├── AdminDashboard.jsx
│   └── DeckStudio.jsx
├── hooks/
│   └── usePing.js
├── context/
│   └── HostTokenProvider.jsx
├── deckStudio/
│   └── [store, schemas, etc.]
└── utils/
    └── imageCompressor.js
```

### Best practices

- **Keep components <200 lines**: Shard complexity into child components
- **Use React hooks for state**: Prefer `useState` + `useContext` over Redux
- **Socket connection**: Managed globally in `App.jsx`, injected via context
- **Tailwind CSS only** — no inline styles or external CSS files
- **Mobile-first**: Build for iPhone first, then desktop

### Testing (future)

Client tests are planned for v1.2.0. For now, manual browser testing is required.

### Hot reload

Vite handles hot module reload. Changes to `.jsx` files **automatically refresh** the browser.

---

## Documentation updates

### When to update docs

- [ ] Added a new feature? Update the relevant guide (e.g., `/guide/architecture.md`)
- [ ] Changed an API? Update API reference in `/guide/`
- [ ] Fixed a bug due to confusion? Add to [Troubleshooting](/guide/troubleshooting)
- [ ] Changed configuration? Update [Configuration](/guide/configuration)

### How to add a new documentation page

1. Create `docs/guide/my-feature.md`
2. Follow the structure of existing guides (intro → why → how → examples → troubleshooting)
3. Add a link in `.vitepress/config.mts` (sidebar navigation)
4. Open a PR and link it to a GitHub issue

### Documentation style

- **Headings**: Use `#` top-level, then `##`, `###`
- **Code blocks**: Use triple-backtick with language (` ```javascript `)
- **Links**: Internal links use relative paths: `[Chat Guide](/guide/chat)`
- **Tables**: Markdown tables with proper alignment
- **Admonitions**: Use VitePress syntax for tips/warnings:
  ```markdown
  ::: tip
  This is helpful context
  :::
  ```

---

## Release process (Maintainers)

1. Create a `release-v1.x.x` branch
2. Update `CHANGELOG.md` and `docs/guide/release-notes.md`
3. Bump version in `server/package.json` and `client/package.json` (if needed)
4. Submit a PR labeled `release`
5. After merge, tag the commit:
   ```bash
   git checkout main && git pull
   git tag v1.x.x
   git push origin v1.x.x
   ```
6. Create a GitHub release with release notes

---

## Performance considerations

### Server

| Concern | Limit | Solution |
|---|---|---|
| Concurrent players | 50–80 | VIP Bouncer (v1.1.0) |
| Chat spam | — | Token bucket rate limiter |
| Large deck | 1000+ questions | Lazy load questions |
| Memory leaks | — | Session cleanup on disconnect |

### Client

| Concern | Solution |
|---|---|
| Mobile keyboard resize | Use `100dvh` instead of `100vh` |
| Large decks | Paginate question rendering |
| Image loading | WebP + compression |

---

## Debugging

### Server-side

```bash
# Enable verbose logging
DEBUG=* npm run dev --prefix server

# Run a single test with logging
npm test --prefix server -- --testNamePattern="submitAnswer"

# Profile a specific function
node --prof server.js
node --prof-process isolate-0001-v8.log > profile.txt
```

### Client-side

Use Chrome DevTools:
- **Network tab**: Monitor Socket.io handshake and message sizes
- **Console**: Check for socket connection errors or client-side exceptions
- **React DevTools**: Inspect component state and props

### Common issues

| Error | Cause | Fix |
|---|---|---|
| "Deck not found" | `DECK_PATH` is wrong or file missing | Check file exists: `ls server/data/decks/` |
| "Cannot connect" | Backend firewall or port wrong | Ensure `PORT` matches `VITE_BACKEND_URL` |
| Test fails with "module not found" | Running from wrong directory | Run from `server/`: `cd server && npm test` |

---

## Development workflow example

```bash
# 1. Start from main
git checkout main && git pull

# 2. Create a feature branch
git checkout -b feat/difficulty-speed-mode

# 3. Edit code — run tests frequently
npm test --prefix server

# 4. Implement the feature in layers
# - server/core/scoringEngine.js (pure logic)
# - server/network/handlers.js (socket event)
# - client/src/components/Host.jsx (UI)

# 5. Commit with Conventional Commits
git add .
git commit -m "feat(engine): add speed mode scoring (50-100 pts based on time)"

# 6. Push and open PR
git push -u origin feat/difficulty-speed-mode
```

---

## Resources

- 📚 **Architecture**: [Architecture Guide](/guide/architecture)
- 🧪 **Testing**: [Testing Guide](/guide/testing)
- 🎮 **Game Design**: [Game Modes](/guide/game-modes)
- 📐 **Deck Format**: [Deck Schema](/guide/deck-schema)
- ✅ **Roadmap**: [Planned Features](/guide/difficulty-engine), [VIP Bouncer](/guide/vip-bounce)

