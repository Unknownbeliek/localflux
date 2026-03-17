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

## Pull request checklist

Before opening a PR, confirm:

- [ ] `npm test --prefix server` passes with no failures
- [ ] New behaviour has test coverage
- [ ] Commit messages follow the Conventional Commits format
- [ ] Branch is up to date with `main` (rebase if needed)
- [ ] PR title follows Conventional Commits format
- [ ] PR description explains *what* changed and *why*

---

## Reporting bugs

Open a [GitHub issue](https://github.com/Unknownbeliek/localflux/issues/new)
with:

- Steps to reproduce
- Expected behaviour
- Actual behaviour
- Node.js and npm versions (`node -v && npm -v`)
- Any error messages from the browser console or server terminal

---

## Suggesting features

Open a GitHub issue labelled `enhancement`. Describe:

- The problem you are trying to solve
- Your proposed solution
- Any alternatives you considered

For large features, discuss in an issue before writing code — it avoids wasted
effort if the direction does not align with the project roadmap.
