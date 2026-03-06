# What is LocalFlux?

LocalFlux is a **bare-metal, self-hosted multiplayer trivia engine** designed
to run entirely on a Local Area Network (LAN) — no internet connection required.

## The Problem It Solves

Every cloud-based quiz platform shares the same fatal flaw: they assume a stable
uplink. Drop 50 phones onto a cheap venue router and you will see the infamous
"spinning wheel of death" within minutes.

LocalFlux sidesteps the cloud entirely. The host machine **is** the server.
Players connect directly to it over Wi-Fi, keeping all WebSocket traffic on the
local subnet — latency measured in single-digit milliseconds, not hundreds.

## Core Principles

| Principle | What it means in practice |
|---|---|
| **LAN-first** | The server binds to `0.0.0.0` so every device on the network can reach it. |
| **Server-authoritative** | Answers, scores, and game state live exclusively in server RAM. |
| **Infrastructure-agnostic** | No database, no cloud account, no Docker required — just Node.js. |
| **Content-agnostic** | Drop any `.json` deck into `data/decks/` and it is playable instantly. |

## What is implemented today

| Feature | Notes |
|---|---|
| **Room create / join** | Host generates a 4-digit PIN; players join by name + PIN |
| **Live lobby** | Host sees players appear in real time as they join |
| **Full quiz loop** | Questions → player answers → reveal → scores → game over |
| **Server-side scoring** | +100 pts per correct answer; answers validated on the server, never the client |
| **LAN play** | Any device on the same Wi-Fi — phones, tablets, laptops |
| **Deck format** | JSON schema with `text_only` and `image_guess` types, per-question time limits, fuzzy-match variants |
| **Unit tests** | 44 Jest tests covering `deckLoader`, `roomStore`, and `gameEngine` |

## What is planned

These features are designed and documented but not yet implemented:

| Feature | Doc |
|---|---|
| **VIP Bouncer** | Connection queue with soft/hard player caps to protect the router | [→](/guide/vip-bounce) |
| **Difficulty Engine** | Per-question scoring multipliers and time pressure modes | [→](/guide/difficulty-engine) |
| **Accolades** | Post-game achievement badges (Speed Demon, Comeback Kid, etc.) | — |
| **Deck Studio** | Browser-based deck builder in the Host Dashboard | — |
| **In-room chat** | Real-time system and player messages during the match | — |
