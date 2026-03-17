# Deployment

How to run LocalFlux for a real event — whether on your local machine or as a
LAN server that 50+ people connect to simultaneously.

## Local development (single machine)

This is covered in the [Get Started](/guide/get-started) guide. Use this mode
for building decks, testing flows, and solo development.

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open `http://localhost:5173` in your browser.

---

## LAN event setup

A LAN event is the primary use-case for LocalFlux. One machine acts as the
server; all other devices (phones, tablets, laptops) connect to it over Wi-Fi.

### Step 1 — Find your LAN IP

```bash
# Linux
ip route get 1 | awk '{print $7; exit}'
# or
hostname -I | awk '{print $1}'

# macOS
ipconfig getifaddr en0
```

Note this IP — you will use it in every URL below. Example: `192.168.1.42`.

### Step 2 — Configure the client

Set `VITE_BACKEND_URL` in `client/.env` to the LAN IP:

```env
VITE_BACKEND_URL=http://192.168.1.42:3000
```

Rebuild or restart the Vite dev server after saving.

### Step 3 — Open the firewall {#firewall}

The backend needs inbound access on its port (default 3000) and the Vite dev
server needs access on its port (default 5173).

**Linux (ufw):**

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 5173/tcp
```

**macOS:**

Go to **System Settings → Network → Firewall** and add Node.js to the allowed
apps, or temporarily disable the firewall for the event.

**Windows (PowerShell, run as administrator):**

```powershell
New-NetFirewallRule -DisplayName "LocalFlux Backend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "LocalFlux Frontend" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
```

### Step 4 — Share the URL with players

Players open the **frontend** URL in their browser:

```
http://192.168.1.42:5173
```

Use LocalFlux's built-in QR code feature: on the **Host** screen, click
**Show QR Code** and project it on screen. Players scan it and land directly on
the join flow.

### Step 5 — Test with a second device

Before the event starts, verify on a phone that:

1. The frontend loads at the LAN URL.
2. The join flow completes successfully.
3. The WebSocket connects (no "Connecting…" spinner).

---

## Production-style deployment (optional)

For a more stable setup — especially at events where the host machine's screen
will be shared — build the frontend and serve it as static files.

```bash
# Build the client
cd client && npm run build

# Serve the static output alongside the backend
# Option A: use a simple static server on a second port
npx serve client/dist -l 5173

# Option B: configure Express to serve client/dist/
# Add this to server.js before the socket setup:
#   app.use(express.static(path.join(__dirname, '../client/dist')));
```

With Option B, the game is served at `http://<your-ip>:3000` — players only
need one URL.

---

## Event-day checklist

Use this before opening the room to players.

### Hardware

- [ ] Host machine is connected to the event Wi-Fi (same network as players)
- [ ] Display / projector is connected and showing the Host screen
- [ ] Battery or power adapter plugged in — don't run out of charge mid-round

### Software

- [ ] `server/` started with `npm run dev` (or `npm start` for production)
- [ ] `client/` started and `VITE_BACKEND_URL` points to the LAN IP
- [ ] Deck loaded — server startup log shows the deck filename and question count
- [ ] Firewall allows ports 3000 and 5173 (or whichever ports you chose)

### Pre-flight test

- [ ] Second device (phone) opens the frontend URL
- [ ] WebSocket connects (no spinner)
- [ ] Join flow completes
- [ ] Host can start a test round and player can submit an answer

### Deck

- [ ] Correct deck loaded for today's event
- [ ] Deck validated with `npm test --prefix server` (no failures)
- [ ] Edge-case questions reviewed (images load, time limits are sane)

### During the event

- [ ] Project the QR code or read out the PIN at the start of each game
- [ ] Monitor the server terminal for any error output
- [ ] Keep a spare tab open to the Host screen in case of accidental navigation

---

## Scaling considerations

LocalFlux is designed for small-to-medium LAN events (10–100 players). The
key bottleneck is the host machine's Wi-Fi bandwidth, not the server software.

| Players | Expected behaviour |
|---|---|
| 1–20 | No special preparation needed |
| 20–50 | Use 5 GHz Wi-Fi if available; avoid 2.4 GHz congestion |
| 50–100 | Dedicated Wi-Fi router for the event; reduce question time window or questions to keep round length predictable |
| 100+ | Not tested; consider the VIP Bouncer feature (in progress) to cap connections gracefully |
