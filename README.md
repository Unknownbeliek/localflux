  # LocalFlux

    *An interactive network architecture simulation that gamifies the Thundering Herd problem and Shock Absorber mechanics.*

    🎯 **[Click Here to View Our Pitch Deck Presentation](#)** *(Note to me: I need to replace the '#' with my actual link!)*

    ## 🚀 Quick Start for Judges
    We built a custom CLI so you can run LocalFlux instantly without dealing with environment variables or dev dependencies.
    1. Download the `localflux-1.0.0.tgz` file from our submission.
    2. Open your terminal in the folder where you downloaded it and run:
      `npm install -g ./localflux-1.0.0.tgz`
    3. Launch the game by typing:
      `localflux`

  Offline-first, self-hosted multiplayer quiz engine built for reliable play on local networks.

  ![Status](https://img.shields.io/badge/Status-v1.0.0_Released-brightgreen)
  ![License](https://img.shields.io/badge/License-MIT-blue)
  ![Stack](https://img.shields.io/badge/Stack-Node.js_%2B_React_%2B_Socket.io-yellow)

  ## Why LocalFlux

  Cloud-first quiz platforms often fail in crowded or low-connectivity environments. LocalFlux runs the full game loop on your LAN so hosts and players can keep playing even when internet quality is poor or unavailable.

  ## What It Includes

  - Realtime multiplayer game server (Node.js, Express, Socket.io)
  - React client for host and player experiences
  - Deck system powered by local JSON files
  - Landing app for project showcase pages
  - VitePress docs site
  - Jest test suite for server logic

  ## Tech Stack

  | Layer | Technology |
  |---|---|
  | Frontend | React 19, Vite, Tailwind CSS v4 |
  | Backend | Node.js, Express, Socket.io |
  | Search/Matching | Fuse.js, string-similarity |
  | Validation | Zod |
  | Storage | Local file system + in-memory state |
  | Testing | Jest |

  ## Project Structure

  ```text
  localflux/
    client/                  # Main game UI (React + Vite)
    server/                  # Game server and socket handlers
      config/
      core/
      data/decks/            # Deck JSON files
      network/
      services/
      tests/
      utils/
    landing/                 # Landing app (React + Vite)
    docs/                    # Project docs (VitePress)
    scripts/                 # Utility scripts
    README.md
  ```

  ## Prerequisites

  - Node.js 18+
  - npm 9+

  ## Installation

  Install dependencies in each package:

  ```bash
  # from localflux/
  npm install

  cd server && npm install
  cd ../client && npm install
  cd ../landing && npm install
  ```

  ## Run Locally

  ### Option A: Run server + client together

  From the repository root:

  ```bash
  npm run dev
  ```

  This starts:

  - `server` via `npm run dev:server`
  - `client` via `npm run dev:client`

  ### Option B: Run services independently

  Server:

  ```bash
  cd server
  npm start
  ```

  Client:

  ```bash
  cd client
  npm run dev
  ```

  Landing app:

  ```bash
  cd landing
  npm run dev
  ```

  Docs:

  ```bash
  cd ..
  npm run docs:dev
  ```

  ## Testing

  Run server tests:

  ```bash
  cd server
  npm test
  ```

  Coverage:

  ```bash
  cd server
  npm run test:coverage
  ```

  ## Documentation

  From the repository root:

  ```bash
  npm run docs:dev
  ```

  Build docs:

  ```bash
  npm run docs:build
  ```

  Preview docs build:

  ```bash
  npm run docs:preview
  ```

  ## License

  Licensed under the MIT License. See [LICENSE](./LICENSE).
