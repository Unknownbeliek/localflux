---
layout: home

hero:
  name: "LocalFlux"
  text: "Zero-Latency LAN Events."
  tagline: >
    A bare-metal, self-hosted multiplayer trivia engine. No cloud.
    No spinning wheels of death. Just raw LAN speed - from the host laptop
    to every player in the room.
  actions:
    - theme: brand
      text: What is LocalFlux?
      link: /guide/what-is-localflux
    - theme: alt
      text: View on GitHub
      link: https://github.com/Unknownbeliek/foss-hack-quiz-engine

features:
  -
    title: Works Offline
    details: >
      The host machine is the server. Players connect over Wi-Fi directly
      to it - no internet uplink required. Traffic never leaves the local
      subnet, so latency is measured in single-digit milliseconds.
  -
    title: Server-Authoritative
    details: >
      Correct answers live exclusively in server RAM and are only
      broadcast at the exact moment a round ends. Players never see
      the question bank - making pre-game answer scraping structurally
      impossible.
  -
    title: Drop-In Decks
    details: >
      Any .json deck placed in data/decks/ is immediately playable.
      The schema supports text questions, image rounds, per-question time
      limits, and fuzzy-match allowances for spelling variants.
---

::: tip ✅ Released — LocalFlux v1.0.0
LocalFlux **v1.0.0 is now live** on the `main` branch and tagged as `v1.0.0`: [github.com/Unknownbeliek/localflux](https://github.com/Unknownbeliek/localflux).
Core gameplay is production-ready: room creation, live lobby, full quiz loop, real-time chat controls, Deck Studio, and host/player reconnect recovery.
:::

## How it works

```
Player A --+
Player B --+--> Wi-Fi Router --> Node.js Server  (localhost:3000)
Player C --+         ^                  |
                  NO internet      Socket.io WS
                  required!        v v v v v
                              All game state
                              served from RAM
```

The server binds to `0.0.0.0` and prints its LAN address on boot.
Share it with players - they open a browser, enter their name and the
room PIN, and the game begins.

## What is built

| Feature | Status |
|---|---|
| Room create / join with 4-digit PIN | Done |
| Host lobby with live player list | Done |
| Full quiz loop (questions - answers - scores - game over) | Done |
| Server-side answer validation + scoring | Done |
| LAN play (any device on the same Wi-Fi) | Done |
| Structured deck format (text + image types) | Done |
| Unit test suite (48 tests, Jest) | Done |
| VIP Bouncer (connection queue) | Planned |
| Difficulty Engine | Planned |
| Accolades / post-game badges | Planned |
| Deck Studio (browser-based editor) | Done |
| In-room chat | Done |