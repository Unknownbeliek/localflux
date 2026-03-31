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
      text: Get Started
      link: /guide/get-started
    - theme: alt
      text: What is LocalFlux?
      link: /guide/what-is-localflux
    - theme: alt
      text: View on GitHub
      link: https://github.com/Unknownbeliek/localflux

features:
  -
    title: Works Offline, Scales Online
    details: >
      The host machine is the server. All 50 players connect over Wi-Fi directly
      to it — no internet uplink required. Sub-100ms LAN latency guaranteed.
      Works in auditoriums, classrooms, underground hackathons.
  -
    title: Server-Authoritative, Cheat-Proof
    details: >
      Correct answers live exclusively in server RAM and are only broadcast
      at round end. The client never sees the question bank — making pre-game
      answer-scraping structurally impossible.
  -
    title: Zero Configuration, Pure Node.js
    details: >
      No Docker, no database, no cloud accounts, no subscriptions. Deploy from
      a single laptop with npm. All game state lives in RAM or JSON files on disk.
  -
    title: Drop-In Decks
    details: >
      Any .json deck placed in data/decks/ is instantly playable.
      Schema supports text questions, images (coming soon),
      type-guess answers with fuzzy matching, and per-question time limits.
  -
    title: Browser-Based Deck Studio
    details: >
      Create and edit quiz decks in the browser. CSV import for bulk questions.
      Validation catches errors before deployment. Export as .flux JSON.
  -
    title: Real-Time Chat & Moderation
    details: >
      Server-side profanity filtering, rate limiting, and host-controlled chat modes
      (Open, Guided, Silent). Players stay engaged in the waiting room.
---

::: warning ⚠️ Work In Progress
LocalFlux is currently under active development and is **not production-ready yet**.
Features and behavior may change while we finalize gameplay stability, UX polish, and deployment flow.
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

Project v1.0.0 is **feature-complete for core gameplay**.

| Feature | Status |
|---|---|
| **LAN play** (50+ on same Wi-Fi) | ✓ Shipped |
| **Quiz loop** (questions, answers, scores, results) | ✓ Shipped |
| **Room PIN system** (join by 4-digit code) | ✓ Shipped |
| **Two game modes** (MCQ + Type Guess) | ✓ Shipped |
| **Deck Studio** (browser-based editor + CSV import) | ✓ Shipped |
| **Real-time chat** (Open / Restricted / Off modes) | ✓ Shipped |
| **Session recovery** (reconnect during game) | ✓ Shipped |
| **Profanity filtering** (server-side moderation) | ✓ Shipped |
| **QR code sharing** (projectable join link) | ✓ Shipped |
| **48 unit tests** (Jest, all critical paths) | ✓ Shipped |
| **VIP Bouncer** (connection queue) | 🔜 v1.1.0 |
| **Difficulty Engine** (Speed / Chaos modes) | 🔜 v1.1.0 |
| **Image delivery** (image_guess type rendering) | 🔜 v1.1.0 |
| **Accolades** (post-game badges) | 🔜 v1.2.0 |
| **Deck hot-reload** (switch decks without restart) | 🔜 v1.2.0 |

## New here?

Start with the guided setup:

- [Get Started](/guide/get-started)
- [Architecture](/guide/architecture)
- [Deck Schema](/guide/deck-schema)