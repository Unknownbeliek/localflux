# Chat Guide

This page documents the waiting-lobby chat for LocalFlux.

Overview
- The chat system is server-authoritative. All validation, rate-limiting and profanity filtering happen on the server.
- Three modes controlled by the Host: `FREE`, `RESTRICTED`, `OFF`.
- Implementation lives in `server/core/chatManager.js` and is wired in `server/network/handlers.js`.

Modes

1. FREE
- Players can type free text.
- Server enforces a token-bucket rate limiter (default: capacity=1, refill=1 token / 2s).
- Server blocks messages containing profanity (leo-profanity). Repeated profanity increases a warning counter; after 3 warnings the socket receives a `chat:muted` event and further messages are rejected until host un-mutes.

2. RESTRICTED
- Client UI shows a grid of pre-canned messages. Each option has an `id` and `text`.
- Clients send only the `id`. Server validates the `id` against a hardcoded `allowedMessages` array and broadcasts the corresponding `text`. Any tampered payload is silently rejected with an ack `{ ok: false }`.

3. OFF
- Chat is disabled. Server drops all chat events and clients hide the UI entirely.

Socket events

- Server -> clients
  - `chat:mode` — { mode: 'FREE'|'RESTRICTED'|'OFF', allowed?: Array<{id,text}> }
  - `chat:message` — { from, name, text, ts, cannedId? }
  - `chat:muted` — { reason }

- Client -> server (with ack callbacks)
  - `chat:free` — { roomPin, text }
  - `chat:pre`  — { roomPin, id }

Implementation notes

- The server uses `zod` for schema validation and `leo-profanity` for profanity detection.
- The ChatManager uses a per-socket token-bucket stored in-memory (`Map`). It cleans up stale entries on disconnect and via periodic GC.
- Pre-canned messages are identified by short ids (e.g. `shout_yes`) to prevent payload tampering.

Configuration

Defaults used in the implementation:
- `tokenCap`: 1
- `tokenRefillMs`: 2000 (1 token / 2s)
- `maxWarnings`: 3
- `staleMs`: 10 minutes (cleanup threshold)

Files touched by this feature
- `server/core/chatManager.js` — core implementation
- `server/network/handlers.js` — socket wiring
- `client/src/components/Chat.jsx` — client UI
- `client/src/components/Host.jsx` & `client/src/components/Player.jsx` — integrated Chat panel
- `server/tests/chatManager.test.js` — unit tests

Testing

Run server tests:

```bash
cd server
npm test
```

Branch & PR

- Feature branch: `feat/chat-manager`
- Draft PR: create a PR from `feat/chat-manager` into `main`. Suggested PR title: `feat(chat): add server ChatManager + client Chat UI`

Security & operational notes

- This is intentionally conservative for classroom use. Profanity is blocked (not sanitized) and repeated violations lead to a mute.
- For deployments with many clients, consider adding per-IP rate limits and connection quotas at the server or reverse-proxy level.

If you'd like, I can open the PR body and finalize reviewers labels and checklist next.
