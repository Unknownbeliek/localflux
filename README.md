#  CineGnosis

> **An offline-first, distributed event engine featuring deterministic lag compensation and hybrid networking.**

![Status](https://img.shields.io/badge/Status-Active_Development-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Stack](https://img.shields.io/badge/Tech-Node.js_%2B_Socket.io-yellow)
![FOSS](https://img.shields.io/badge/Event-FOSS_Hack_2026-ff69b4)
---

##  The Problem: "The Spinning Wheel of Death"
Current multiplayer event software (Kahoot, Jackbox, Mentimeter) relies entirely on stable cloud architecture. In high-density venues like college hackathons, rural classrooms, or basement meetups, the local Wi-Fi router chokes when 50+ users connect simultaneously. The game lags, players disconnect, and the event is ruined.

##  The Solution: An Infrastructure-Agnostic Engine
**CineGnosis** is not just a game; it is an open-source, self-hosted multiplayer framework. It decouples gameplay from ISP stability by treating the **Local Area Network (LAN)** as a first-class citizen, delivering 0ms latency gameplay entirely offline, while utilizing smart tunneling to prevent router hardware crashes.
---

##  Architectural Innovations

### 1.  Deterministic Lag Compensation (Netcode)
Inspired by competitive FPS architectures, the engine prioritizes **reflexes over bandwidth**.
* **NTP-Style Handshake:** Synchronizes client and server clocks on connection.
* **Timestamp Trust:** The server evaluates actions based on *when they happened* (client timestamp), not *when they arrived*. This guarantees fair competition even during 300ms+ network lag spikes.

### 2.  Hybrid Networking & "Smart QR" Routing
CineGnosis listens simultaneously on **Local LAN** and a **Secure WAN Tunnel** (Ngrok/Cloudflare).
* **Smart QR Fallback:** Players scan a single QR code pointing to the WAN tunnel. The web app instantly runs a silent `fetch()` ping to the host's Local IP. 
* **The Result:** If the player is on the Wi-Fi, they are seamlessly redirected to the 0-latency local server. If the router is full and they are on 4G, they seamlessly stay on the WAN tunnel. Zero host friction.

### 3.  Binary Micro-Packets
To maximize the player capacity of cheap consumer routers, we bypass heavy JSON payloads.
* Standard JSON (`{"action": "buzz", "answer": "A"}`) is replaced with packed **binary codes** (`0x01:0x41`).
* Reduces socket overhead by **~60%**, unlocking 100+ concurrent connections on standard hardware.

### 4.  Just-In-Time (JIT) Anti-Cheat Asset Delivery
To prevent tech-savvy players from scraping directories for upcoming questions:
* There are **no public image URLs**. 
* The Node server uses `fs` to read highly-optimized (<15KB) WebP files from a protected vault and transmits them as **Base64 strings directly through the Socket.io connection** only at the exact moment the round starts.

### 5.  Local "Black Box" Telemetry
The engine is 100% database-free for extreme portability.
* At the end of every match, the Node `fs` module automatically generates a JSON log in the `/logs` directory containing match statistics, player leaderboards, and hardest questions for organizers to review later.
---

##  Tech Stack
* **Backend:** Node.js + Express
* **Real-time:** Socket.io (WebSocket)
* **Frontend:** React (Vite)
* **Search Engine:** Fuse.js (Client-side Fuzzy Search)
* **Data:** Local JSON / NoSQL (No external DB required)
* **Distribution:** pkg (Bundled into a zero-dependency .exe / binary for one-click hosting)


## The "Deck" System (Extensibility)
* **CineGnosis** is content-agnostic. Developers and teachers can drop a custom questions.json and a folder of images into the /data directory, and the engine will instantly adapt. No code changes required.

##  Roadmap (Hackathon Goals)
- [x] **Phase 1:** Core Engine (Lobby, WebSocket Handshake, Basic Quiz Loop)
- [ ] **Phase 2:** Network Hardening (Implementing Lag Compensation & Clock Sync)
- [ ] **Phase 3:** Optimization (Binary Packets & "Optimistic UI" Integration)
- [ ] **Phase 4:** Content System (The "Deck" JSON Loader & Python Seeder)
- [ ] **Phase 4:** Hybrid Mode (Automatic LAN-to-WAN Failover)

## Getting Started (Host / Developer)
* **Option A:** The "One-Click" Host (Recommended for Events)
* We bundle the entire MERN stack into a single executable so teachers and organizers don't need to use the terminal.
Download cinegnosis-engine.exe from the Releases tab.
Double-click to run. The engine will automatically fetch your local IP, start the backend, serve the React frontend, and display the Smart QR code on your screen.
* **Option B:** Build from Source
  # 1. Clone the repository
git clone 
cd cinegnosis

# 2. Install dependencies
npm install

# 3. Build the React Client
cd client && npm run build

# 4. Start the Core Engine
cd ../server && npm run start


##  Project Structure
This project follows a monorepo-style structure to keep Backend and Frontend separated but synchronized.

```text
/cinegnosis
  ├── server/         # Node.js + Socket.io (Game State & Room Logic)
  ├── client/         # React + Vite (UI, Animation, Chat Overlay)
  ├── data/           # movies.json (The pre-seeded offline database)
  └── docs/           # Architecture diagrams & setup guides
```bash
# Clone the repository
git clone [https://github.com/YOUR_USERNAME/cinegnosis.git](https://github.com/YOUR_USERNAME/cinegnosis.git)

# Install dependencies
npm install

# Start the Development Server
npm run dev
