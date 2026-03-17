# Get Started

## Quickstart in 60 seconds

Already have Node 20+ and npm 9+? Copy and paste this block into your terminal:

```bash
git clone https://github.com/Unknownbeliek/localflux.git
cd localflux
npm install --prefix server && npm install --prefix client
cp client/.env.example client/.env   # edit VITE_BACKEND_URL if needed
npm run dev --prefix server &
npm run dev --prefix client
```

Open the Vite URL, click **Host**, create a room, and join from another tab with the PIN. Done.

For a detailed walkthrough, keep reading.

---

## Prerequisites

- Node.js 20+ (recommended) or 18+
- npm 9+
- A terminal with two tabs/windows

Check your versions:

```bash
node -v
npm -v
```

## 1) Clone the repository

```bash
git clone https://github.com/Unknownbeliek/localflux.git
cd localflux
```

## 2) Install dependencies

Install server dependencies:

```bash
cd server
npm install
```

Install client dependencies:

```bash
cd ../client
npm install
```

## 3) Configure frontend backend URL (optional but recommended)

Create a frontend env file at `client/.env`:

```env
VITE_BACKEND_URL=http://localhost:3000
```

If you are running in Codespaces, use your forwarded backend URL instead.

## 4) Start the backend

From `server/`:

```bash
npm run dev
```

Expected result:

- Server starts on port 3000
- Decks are loaded from `data/decks/`

## 5) Start the frontend

In a second terminal, from `client/`:

```bash
npm run dev
```

Open the printed Vite URL in your browser.

## 6) Verify end-to-end flow

- Open Home screen
- Click Host and create a room
- Join from another tab/device with room PIN
- Start game and answer at least one question

### Host flow at a glance

![Host creates a room, lobby shows joining players, game runs with live score updates](/screenshots/host-flow-placeholder.png)

::: tip Screenshots coming soon
Host flow screenshots and GIFs will be added here. The flow is: **Home → Host → Lobby (share PIN) → Question screen → Score reveal → Game over**.
:::

### Deck Studio flow

![Deck Studio editor with card list, CSV import button, and export control](/screenshots/deck-studio-placeholder.png)

::: tip Screenshots coming soon
Deck Studio screenshots will be added here. The flow is: **Home → Deck Studio → New deck → Add/import cards → Validate → Export .flux**.
:::

## 7) Run tests (server)

From repository root:

```bash
npm run test --prefix server
```

Expected result: all test suites pass.

## Common issues

### Frontend stuck at connecting

- Confirm backend is running on port 3000
- Verify `VITE_BACKEND_URL` points to the backend
- Restart frontend dev server after env changes

### Address already in use (EADDRINUSE)

A previous server process may still be running.

```bash
# Linux/macOS
lsof -i :3000
# Then stop the process by PID
kill <PID>
```

### Cannot install dependencies due to peer dependency resolution

If npm fails with `ERESOLVE`, retry:

```bash
npm install --legacy-peer-deps
```

Use this only when needed.

## Next steps

- Configure env vars in detail: [Configuration](/guide/configuration)
- Deploy to a LAN event: [Deployment](/guide/deployment)
- Learn architecture: [Architecture](/guide/architecture)
- Understand deck format: [Deck Schema](/guide/deck-schema)
- Validate quality gates: [Testing](/guide/testing)
- Troubleshoot common problems: [Troubleshooting](/guide/troubleshooting)
