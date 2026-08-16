# StarCraft 1 - Browser Edition

Play classic StarCraft 1 in a browser tab, streamed from Docker containers
running Wine. Built for LAN parties: pick a race, get a live game window,
play with whoever else on the network joins the other two slots.

## Architecture

```
Browser
  │
  ├── Frontend (React, nginx)              :4000
  │     enter a name → pick a session
  │
  ├── Game Server - Terran   (Wine + SC1 → x11vnc → noVNC)   :4001
  ├── Game Server - Protoss  (Wine + SC1 → x11vnc → noVNC)   :4004
  └── Game Server - Zerg     (Wine + SC1 → x11vnc → noVNC)   :4007
        each also streams audio (PulseAudio → raw PCM → WebSocket →
        Web Audio API) and reports live occupancy via a status endpoint
```

There's no login, database, or orchestrator API - just a name (stored in
the browser) and three fixed, always-on game sessions. Each game server
container stays up continuously (streaming stack, audio, status endpoint),
but StarCraft itself only launches when a player actually connects and
gets stopped the moment they disconnect - an idle session costs next to
no CPU, and joining after idle takes a few seconds while Wine cold-starts.

## Prerequisites

- Docker & Docker Compose on the host
- Your own legally-owned StarCraft 1 files, patched to run without a CD

## Setup

**1. Add your game files**

Drop your StarCraft install into `SC1/` (see [`SC1/README.md`](SC1/README.md)
for the expected layout). This directory is gitignored - you supply your
own copy, it's never pushed to GitHub.

**2. Build and start everything**

```bash
git clone <this-repo-url>
cd SC1DOCKER
docker-compose up -d --build
```

**3. Play**

Open `http://<docker-host-ip>:4000`, enter a name, and pick a race. Each
session opens in a new tab streaming the live game.

## Ports

All ten host ports live in the 4000 range:

| Service | Port | Purpose |
|---|---|---|
| Frontend | 4000 | Lobby web UI |
| Terran video / audio / status | 4001 / 4002 / 4003 | noVNC stream, raw-PCM audio WebSocket, occupancy JSON |
| Protoss video / audio / status | 4004 / 4005 / 4006 | noVNC stream, raw-PCM audio WebSocket, occupancy JSON |
| Zerg video / audio / status | 4007 / 4008 / 4009 | noVNC stream, raw-PCM audio WebSocket, occupancy JSON |

**Reverse proxy note:** every one of the game-server ports (video, audio,
status) is HTTP-upgradable - noVNC and the audio stream are both plain
WebSockets, and status is plain JSON - so all ten *can* go through an
nginx-based proxy (e.g. Nginx Proxy Manager) with "Websockets Support"
enabled. The catch: the frontend's JS builds every game/audio/status URL
as "same hostname the page was loaded from, different port" - it never
hardcodes an IP. That works two ways:
- **LAN-only (simplest):** only proxy the frontend (4000) behind your
  domain/SSL for convenient access; leave 4001-4009 as plain LAN ports
  (or don't forward them past your router at all if this never leaves
  the LAN). This is what the "same hostname" logic assumes by default.
- **Fully remote-playable:** proxy all ten ports. Since a reverse proxy
  fronts everything on 443 by hostname rather than by port number, this
  needs one proxy host per port (subdomains work well - e.g.
  `sc1.`, `terran.`, `terran-audio.`, `terran-status.`, etc.) rather
  than a single domain with different ports in the URL.

## Persistence

Save games and the Wine prefix live in per-race Docker named volumes
(`sc1_data_*`, `sc1_wine_*`), not in the container's disposable layer, so
they survive `docker-compose down`/`up` and rebuilds. Only an explicit
`docker-compose down -v` wipes them.

## Project structure

```
SC1DOCKER/
├── docker-compose.yml
├── SC1/                        # your game files go here (gitignored)
├── docker/game-server/
│   ├── Dockerfile              # Ubuntu + Wine + x11vnc/noVNC + PulseAudio
│   ├── start.sh                # boots Xvfb, audio, Wine/SC1, x11vnc, status server
│   ├── index.html.template     # per-race branded noVNC landing page
│   ├── status_server.py        # tiny CORS status endpoint
│   └── emblems/                # race SVG emblems
└── frontend/
    ├── Dockerfile               # React build → nginx
    └── src/
        ├── App.js
        ├── components/
        │   ├── LoginPage.js
        │   ├── Lobby.js
        │   └── Emblems.js
        └── index.css
```

## Troubleshooting

```bash
# Logs for a specific game server
docker-compose logs -f game-server-1

# Full rebuild (needed after changing Dockerfile/start.sh/docker-compose.yml)
docker-compose down
docker-compose up -d --build

# Container status
docker-compose ps
```

## License

MIT
