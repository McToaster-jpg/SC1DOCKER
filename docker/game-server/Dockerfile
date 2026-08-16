# Game Server Container - Runs StarCraft 1 with VNC streaming
FROM ubuntu:22.04

# Skip interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
RUN ln -fs /usr/share/zoneinfo/UTC /etc/localtime

# Enable 32-bit architecture and install dependencies
RUN dpkg --add-architecture i386 && \
    apt-get update && apt-get install -y \
    wine \
    wine32 \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    gettext-base \
    pulseaudio \
    iproute2 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create game user
RUN useradd -m -u 1000 gamer

# Custom themed index page (rendered per-race at container start via envsubst)
COPY docker/game-server/index.html.template /usr/share/novnc/index.html.template
COPY docker/game-server/emblems/ /usr/share/novnc/emblems/

# Tiny CORS-enabled status endpoint the lobby polls for occupancy
COPY docker/game-server/status_server.py /status_server.py

# Set up VNC and display
ENV DISPLAY=:99
ENV WINE_CPU_TOPOLOGY=4:2
ENV WINEARCH=win32
ENV WINEPREFIX=/home/gamer/.wine

# Race branding (overridden per game-server in docker-compose)
ENV RACE_NAME=TERRAN
ENV RACE_COLOR=#00b4ff

# Create directories and X11 socket directory (owned by root)
RUN mkdir -p /home/gamer/games && chown -R gamer:gamer /home/gamer && \
    mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix

# Copy SC1 files
COPY SC1/ /home/gamer/games/SC1/
RUN chown -R gamer:gamer /home/gamer/games/SC1

# Pre-create the Wine prefix dir owned by gamer (it doesn't exist until
# Wine's first launch otherwise) so that when a named volume is mounted
# here at runtime, Docker seeds it with correct ownership instead of an
# empty root-owned directory gamer can't write into.
RUN mkdir -p /home/gamer/.wine && chown -R gamer:gamer /home/gamer/.wine

# Copy startup script
COPY docker/game-server/start.sh /start.sh
RUN chmod +x /start.sh

# Expose VNC, noVNC, audio, and status ports
EXPOSE 5900
EXPOSE 6080
EXPOSE 8000
EXPOSE 6081

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:6080/vnc.html || exit 1

ENTRYPOINT ["/start.sh"]
