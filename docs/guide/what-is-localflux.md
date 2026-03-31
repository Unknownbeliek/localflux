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
| **Server-side scoring** | MCQ uses legacy timed/streak score; type-guess uses breakdown scoring engine |
| **LAN play** | Any device on the same Wi-Fi — phones, tablets, laptops |
| **Deck format** | JSON schema with `text_only` and `image_guess` types, per-question time limits, fuzzy-match variants |
| **Deck Studio** | Browser-based deck editor with CSV import, validation, and .flux export |
| **In-room chat** | Host-managed chat modes (`FREE`, `RESTRICTED`, `OFF`) with moderation controls |
| **Session recovery** | Host and player reconnect recovery after accidental refresh/disconnect |
| **Server tests** | Jest suites across gameplay, handlers, chat, scoring, deck, and integration flow |

## What is planned

These features are still in progress:

| Feature | Doc |
|---|---|
| **VIP Queue UX** | Position-aware waiting queue (capacity enforcement already exists) | [→](/guide/vip-bounce) |
| **Advanced Difficulty Modes** | Speed/Chaos style runtime scoring modes | [→](/guide/difficulty-engine) |
| **Accolades** | Post-game achievement badges (Speed Demon, Comeback Kid, etc.) | — |
