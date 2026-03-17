# Get Started

## Quickstart in 60 seconds

Already have Node.js 20+ and npm 9+? Copy the block for your platform, run it, then open the Vite URL in your browser.

::: code-group

```bash [macOS / Linux]
git clone https://github.com/Unknownbeliek/localflux.git
cd localflux
npm install --prefix server && npm install --prefix client
cp client/.env.example client/.env
npm run dev --prefix server &
npm run dev --prefix client
```

```powershell [Windows (PowerShell)]
git clone https://github.com/Unknownbeliek/localflux.git
cd localflux
npm install --prefix server; npm install --prefix client
copy client\.env.example client\.env
Start-Process -NoNewWindow -FilePath npm -ArgumentList "run","dev","--prefix","server"
npm run dev --prefix client
```

:::

Click **Host**, create a room, and join from another tab with the PIN. That is all.

For a step-by-step walkthrough of each stage, continue reading.

For a detailed walkthrough, keep reading.

---

## Prerequisites

| Tool | Minimum | Recommended | Notes |
|------|---------|-------------|-------|
| **Node.js** | 18.x LTS | 20.x LTS | Runs the server and builds the client |
| **npm** | 9.x | latest | Bundled with Node.js — no separate install needed |
| **Git** | any | latest | Required to clone the repository |
| **Terminal** | — | — | Two separate tabs or windows (one for server, one for client) |

### Installing Node.js

The recommended approach on all platforms is **nvm** (Node Version Manager), which lets you switch Node.js versions without affecting other projects.

::: code-group

```bash [macOS (nvm)]
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.zshrc   # or ~/.bashrc if you use bash

# Install and activate Node.js 20
nvm install 20
nvm use 20
```

```bash [Linux (nvm)]
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install and activate Node.js 20
nvm install 20
nvm use 20
```

```powershell [Windows (nvm-windows)]
# Download and install nvm-windows from:
# https://github.com/coreybutler/nvm-windows/releases
# Then open a new PowerShell window and run:

nvm install 20
nvm use 20
```

:::

::: tip Prefer a GUI installer?
Download the LTS installer directly from [nodejs.org](https://nodejs.org/). This bundles Node.js and npm for all platforms.
:::

Verify your installation:

```bash
node -v   # expected: v20.x.x or higher
npm -v    # expected: 9.x.x or higher
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

## 3) Configure the frontend backend URL (optional but recommended)

Create `client/.env` from the provided example file:

::: code-group

```bash [macOS / Linux]
cp client/.env.example client/.env
```

```powershell [Windows]
copy client\.env.example client\.env
```

:::

Open `client/.env` in a text editor and set the backend URL:

```env
VITE_BACKEND_URL=http://localhost:3000
```

::: info GitHub Codespaces
Replace `http://localhost:3000` with the forwarded port URL shown in the **Ports** tab of your Codespace. See [Troubleshooting → Codespaces](/guide/troubleshooting#failed-to-connect-in-github-codespaces) for details.
:::

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

A previous server process is still holding port 3000. Find and stop it:

::: code-group

```bash [macOS / Linux]
# Find the process using port 3000
lsof -i :3000

# Stop it by PID (replace <PID> with the number shown above)
kill <PID>
```

```powershell [Windows]
# Find the process using port 3000
netstat -ano | findstr :3000

# Stop it by PID (replace <PID> with the number in the last column)
taskkill /PID <PID> /F
```

:::

Alternatively, start the server on a different port and update `VITE_BACKEND_URL` to match:

::: code-group

```bash [macOS / Linux]
PORT=3001 npm run dev
```

```powershell [Windows]
$env:PORT=3001; npm run dev
```

:::

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
