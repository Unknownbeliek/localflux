# LocalFlux — Hybrid Real-Time Quiz Platform

**Version 2.0.0 | Hybrid Online & Offline**

![Status](https://img.shields.io/badge/Status-v2.0.0_Released-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Stack](https://img.shields.io/badge/Stack-Node.js_%2B_React_%2B_Socket.IO_%2B_Vite-yellow)
![Deploy](https://img.shields.io/badge/Deploy-Vercel_%2B_Railway-black)

---

## Overview

**LocalFlux v2.0.0** is an open-source, hybrid real-time quiz engine designed to run seamlessly both **online** (cloud-hosted via Vercel + Railway/Render) and **offline** (zero-internet LAN party or classroom environment via `npx localflux` or GitHub clone).

Whether hosting an event for thousands of online participants across the world or conducting a zero-latency trivia night in a cellar with no internet, LocalFlux operates from a unified codebase using intelligent environment adapters.

---

## ⚡ Quick Start Options

### 1. Instant Online Play (No Installation)
- **Landing Page:** [localflux.app](https://localflux.app)
- **Web App:** [app.localflux.app](https://app.localflux.app)
- Join instantly from any desktop or mobile browser using a 4-character room code.

### 2. Instant Local / Offline Execution (One Command)
Run LocalFlux locally on your machine with zero setup:

```bash
npx localflux@latest
```

This starts both the static client server and the real-time game backend on your local machine and opens your browser automatically.

---

## 🏗️ Hybrid Architecture

LocalFlux separates the **Presentation Layer** from the **State & Real-Time Engine**:

```text
                             ┌───────────────────────────────────┐
                             │           ONLINE MODE             │
                             │                                   │
  Browser (Landing) ─────────► Vercel Edge (landing/)            │
                             │    localflux.app                  │
                             │                                   │
  Browser (App) ─────────────► Vercel Static (client/)           │
                             │    app.localflux.app              │
                             │         │                         │
                             │         │ WebSocket / HTTP        │
                             │         ▼                         │
                             │  ┌─────────────────────────────┐  │
                             │  │ Railway / Render            │  │
                             │  │ game-server (Node.js)       │  │
                             │  │ + Socket.IO + Redis Adapter │  │
                             │  │ + Cloudflare R2 / AWS S3   │  │
                             │  └─────────────────────────────┘  │
                             └───────────────────────────────────┘

                             ┌───────────────────────────────────┐
                             │          OFFLINE MODE             │
                             │                                   │
  Local Browser ─────────────► localhost:4173 (CLI Static Server)│
                             │         │                         │
                             │         │ WebSocket / HTTP        │
                             │         ▼                         │
                             │  ┌─────────────────────────────┐  │
                             │  │ localhost:3000              │  │
                             │  │ game-server (Node.js)       │  │
                             │  │ + Socket.IO (In-Memory)     │  │
                             │  │ + Local Filesystem Storage  │  │
                             │  └─────────────────────────────┘  │
                             └───────────────────────────────────┘
```

---

## 🚀 Features Matrix

| Feature | Online Mode (`localflux.app`) | Offline Mode (`npx localflux`) |
|---------|------------------------------|--------------------------------|
| **Real-time Engine** | Socket.IO + Redis state adapter | Socket.IO in-memory state |
| **Room Discovery** | 4-Character Room Join Codes | LAN IP detection & QR Gateway |
| **Host Dashboard** | Password / JWT Token Auth | Auto-granted on localhost |
| **Asset Storage** | Cloud Object Storage (R2 / S3) | Local Filesystem (`/public/uploads`) |
| **Internet Required** | Yes | **No** (100% offline ready) |
| **Deployment** | Vercel (Client) + Railway (Server) | Single-command CLI or local script |

---

## 📂 Monorepo Structure

```text
/localflux
  ├── client/               # React 19 + Vite frontend (App & Host/Player UI)
  │   └── bin/cli.js        # CLI entry point for npx localflux
  ├── server/               # Node.js + Express + Socket.IO game backend
  │   ├── core/             # Game loop, scoring engine, room manager
  │   ├── network/          # Socket event handlers
  │   └── adapters/         # Storage & state persistence adapters (Memory/Redis, Local/R2)
  ├── landing/              # Marketing & landing page (React 19 + Vite + Three.js)
  ├── docs/                 # VitePress documentation site
  ├── vercel.json           # Vercel deployment configuration
  └── package.json          # Root monorepo workspace configuration
```

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/Unknownbeliek/localflux.git
   cd localflux
   ```

2. **Install all dependencies**
   ```bash
   npm run dev
   ```

3. **Start backend & frontend concurrently**
   ```bash
   npm run dev
   ```

- Frontend client runs at `http://localhost:5173`
- Backend server runs at `http://localhost:3000`

---

## 🌐 Cloud Deployment Guide (Vercel + Railway)

### 1. Backend Server Deployment (Railway / Render / Fly.io)
Deploy the `server/` directory as a Node.js web service:

- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Environment Variables:**
  - `PORT`: `3000`
  - `STORAGE_MODE`: `redis` (or `memory`)
  - `REDIS_URL`: `redis://default:password@host:port`
  - `HOST_PASSWORD`: `<your-secret-host-password>`
  - `ALLOWED_ORIGIN`: `https://app.localflux.app`
  - `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (optional, for Cloudflare R2 image uploads)

### 2. Frontend & Landing Deployment (Vercel)
Deploy the repository to Vercel:

- **Landing Page (`localflux.app`):** Set Root Directory to `landing`
- **Client App (`app.localflux.app`):** Set Root Directory to `client`
- **Environment Variables for Client:**
  - `VITE_BACKEND_URL`: `https://your-railway-server.up.railway.app`

---

## 🔑 Environment Variables Reference

Create a `.env` file in `client/` or `server/` based on your mode:

| Variable | Scope | Required Online | Default | Purpose |
|----------|-------|-----------------|---------|---------|
| `VITE_BACKEND_URL` | Client | **Yes** | `http://localhost:3000` | Points client to backend server |
| `PORT` | Server | No | `3000` | HTTP & Socket port |
| `STORAGE_MODE` | Server | Recommended | `memory` | `memory` or `redis` |
| `REDIS_URL` | Server | If `STORAGE_MODE=redis` | — | Redis connection string |
| `HOST_PASSWORD` | Server | **Yes** | — | Password for remote host authentication |
| `ALLOWED_ORIGIN` | Server | **Yes** | `*` | CORS origin restrictions |

---

## 📜 License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.

```text
MIT License
Copyright (c) 2026 Unknownbeliek
```
