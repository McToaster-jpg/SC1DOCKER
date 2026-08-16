# StarCraft 1 - Browser Edition

Play classic StarCraft 1 in a browser tab, streamed from Docker containers
running Wine. Built for LAN parties: pick a race, get a live game window,
play with whoever else on the network joins the other two slots.

## Architecture

```
Browser
  │
  ├── Frontend (React, nginx)              :9050
  │     enter a name → pick a session
  │
  ├── Game Server - Terran   (Wine + SC1 → x11vnc → noVNC)   :6122
  ├── Game Server - Protoss  (Wine + SC1 → x11vnc → noVNC)   :6223
  └── Game Server - Zerg     (Wine + SC1 → x11vnc → noVNC)   :6324
        each also streams audio (PulseAudio → ffmpeg → MP3 over HTTP)
        and reports live occupancy via a small status endpoint
```

There's no login, database, or orchestrator API - just a name (stored in
the browser) and three fixed, always-on game sessions. Each game server
is its own container; disconnecting a session automatically recycles that
container so the next player gets a fresh instance.

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

Open `http://<docker-host-ip>:9050`, enter a name, and pick a race. Each
session opens in a new tab streaming the live game.

## Ports

| Service | Port | Purpose |
|---|---|---|
| Frontend | 9050 | Lobby web UI |
| Terran / Protoss / Zerg video | 6122 / 6223 / 6324 | noVNC game stream |
| Terran / Protoss / Zerg audio | 8081 / 8082 / 8083 | MP3 audio stream |
| Terran / Protoss / Zerg status | 8091 / 8092 / 8093 | Occupancy JSON, polled by the lobby |

If you're putting this behind a reverse proxy for a domain/SSL, the
frontend on 9050 is the only port that strictly needs to be
internet-facing; the game/audio/status ports are meant for LAN access.

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
