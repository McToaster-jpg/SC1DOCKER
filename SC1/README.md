# StarCraft 1 Game Files

This directory is where you place your own legally-owned, CD-free-patched
StarCraft 1 installation. It's excluded from git (only this file is
tracked) because the game files are large and because you need to supply
your own copy.

## What goes here

Drop your StarCraft install directly into `SC1/`, so this file sits next
to it:

```
SC1/
├── README.md          (this file)
├── StarCraft.exe
├── StarDat.mpq
├── BrooDat.mpq         (if present)
└── ...                 (whatever else your install includes)
```

`docker/game-server/Dockerfile` copies this entire directory into each
game-server image (`COPY SC1/ /home/gamer/games/SC1/`), and `start.sh`
auto-detects the executable at container start via `find . -name "*.exe"`,
so no path configuration is needed beyond putting the files here.

## After adding files

Rebuild the game-server images so the new files get baked in:

```bash
docker-compose up -d --build
```

Save games and the Wine prefix are persisted separately via Docker named
volumes (see `docker-compose.yml`), so once a container has been created
you generally only need to rebuild here if you're changing the base game
files themselves.
