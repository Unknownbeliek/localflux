# VIP Bouncer

> **Status: Partially Implemented**

LocalFlux already enforces capacity limits at join time. A full visual waiting queue is still planned.

---

## Problem

A standard home or venue Wi-Fi router can handle ~50 concurrent WebSocket
connections comfortably. When 60–80 players try to connect at exactly the same
moment (e.g. the host shares a QR code on a projector), the SYN flood can
cause the router to drop packets or reset connections, making the game
unreachable for several seconds.

---

## Current implementation

### Capacity controls

| Control | Source | Default | Behavior |
|---|---|---|---|
| Default room cap | `DEFAULT_ROOM_MAX_PLAYERS` env | `20` | Initial max players for created room |
| Hard clamp | `HARD_MAX_PLAYERS` env | `250` | Upper bound server will accept |
| Hotspot cap | `HOTSPOT_MAX_PLAYERS` constant | `10` | Effective cap when hotspot-like network is detected |

When room capacity is reached, join handlers return a structured `room_full` response containing:

- `maxPlayers`
- `effectiveMaxPlayers`
- `currentPlayers`

There is currently no server-managed queue admission flow.

---

## Planned next step

1. Add FIFO queue state to room runtime shape
2. Emit queue position updates to waiting players
3. Auto-admit queued players when slots open
4. Add host UI for queue depth/health

---

## Relevant files

| File | Purpose |
|---|---|
| `server/network/handlers.js` | Capacity checks, effective max calculation, room full responses |
| `server/core/roomStore.js` | Stores room max player metadata |
| `server/utils/networkUtils.js` | Hotspot detection used to lower effective cap |
