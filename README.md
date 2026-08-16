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

## Reverse proxy / public domain

By default the lobby builds every game/audio/status URL as "same host the
page loaded from, different port" - fine on a LAN, but it breaks once the
frontend is served over HTTPS: browsers block a secure page from opening
plain `ws://`/`http://` connections to other ports (mixed content), and a
reverse proxy fronts things by *hostname* on 443, not by port number in
the URL. So going through SSL/a domain needs subdomains, one per port,
each proxied to this Docker host's LAN IP with **Websockets Support**
enabled (video and audio are both WebSocket-based; status is plain JSON
but the toggle doesn't hurt):

| Proxy host | → Target port | Purpose |
|---|---|---|
| `<domain>` | 4000 | Frontend |
| `terran.<domain>` | 4001 | Terran video |
| `terran-audio.<domain>` | 4002 | Terran audio |
| `terran-status.<domain>` | 4003 | Terran occupancy status |
| `protoss.<domain>` | 4004 | Protoss video |
| `protoss-audio.<domain>` | 4005 | Protoss audio |
| `protoss-status.<domain>` | 4006 | Protoss occupancy status |
| `zerg.<domain>` | 4007 | Zerg video |
| `zerg-audio.<domain>` | 4008 | Zerg audio |
| `zerg-status.<domain>` | 4009 | Zerg occupancy status |

Then tell the app about the domain: copy `.env.example` to `.env`, set
`PUBLIC_DOMAIN=yourdomain.com`, and rebuild:

```bash
cp .env.example .env
# edit .env, set PUBLIC_DOMAIN
docker-compose up -d --build
```

With `PUBLIC_DOMAIN` set, the lobby switches to `https://terran.yourdomain.com`
style URLs (baked into the frontend at build time) and each game session's
audio switches to `wss://terran-audio.yourdomain.com` instead of the LAN
scheme. The video stream (noVNC) needs no special handling - its
WebSocket connection is same-origin relative to whatever page loaded it,
so it automatically follows the proxy correctly.

Leave `PUBLIC_DOMAIN` unset for LAN-only play - nothing else changes.

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
