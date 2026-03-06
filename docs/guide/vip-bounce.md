# VIP Bouncer

> **Status: Planned** — not yet implemented.

This page describes the design for the VIP Bouncer — a two-tier admission
system that prevents consumer routers from being overwhelmed by simultaneous
WebSocket connection attempts.

---

## Problem

A standard home or venue Wi-Fi router can handle ~50 concurrent WebSocket
connections comfortably. When 60–80 players try to connect at exactly the same
moment (e.g. the host shares a QR code on a projector), the SYN flood can
cause the router to drop packets or reset connections, making the game
unreachable for several seconds.

---

## Design

### Two caps

| Cap | Value | Behaviour |
|---|---|---|
| Soft cap | 40 players | New connections are accepted normally below this |
| Hard cap | 50 players | Connections above 40 are placed in a **waiting queue** |

Both values will be configurable via environment variables:

```bash
VIP_SOFT_CAP=40
VIP_HARD_CAP=50
```

### Queue behaviour

When a 41st player connects:

1. Their socket is accepted (TCP handshake completes — this is intentional; dropping at TCP level is worse for routers)
2. They receive a `queue_position` event with their place in line
3. They see a "You're in the queue — position X" screen in the client
4. As existing players leave, the queue drains in FIFO order
5. When their slot opens they receive `queue_admitted` and proceed to the normal join flow

### Host visibility

The host lobby will show:

- Active players (≤ soft cap)
- Queue depth ("12 waiting")

---

## Implementation plan

1. Add `softCap` and `hardCap` to room creation options in `roomStore.js`
2. In `handlers.js` `join_room`: check `room.players.length` against caps before calling `addPlayer()`
3. Add a `queue` array to the room shape: `queue: [{ socketId, playerName }]`
4. On player disconnect: drain one from `queue` if present, emit `queue_admitted`
5. Add `queue_position` and `queue_admitted` socket events to `Player.jsx`
6. Add queue depth display to `Host.jsx` lobby screen

---

## Files that will change

| File | Change |
|---|---|
| `server/core/roomStore.js` | Add `queue` array to room shape; add `enqueuePlayer()` and `drainQueue()` helpers |
| `server/network/handlers.js` | Gate `join_room` on cap; emit `queue_position` |
| `client/src/components/Player.jsx` | New `queued` phase with position display |
| `client/src/components/Host.jsx` | Queue depth badge in lobby |
| `server/tests/roomStore.test.js` | Tests for `enqueuePlayer`, `drainQueue` |
