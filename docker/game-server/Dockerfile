# Game Server Container - Runs StarCraft 1 streamed to the browser via Selkies
FROM ubuntu:22.04

# Skip interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
RUN ln -fs /usr/share/zoneinfo/UTC /etc/localtime

# Enable 32-bit architecture and install dependencies.
# Package list per Selkies' documented Ubuntu install requirements, plus
# Wine (32-bit, for StarCraft) and PulseAudio (audio capture source).
RUN dpkg --add-architecture i386 && \
    apt-get update && apt-get install -y \
    wine \
    wine32 \
    xvfb \
    xserver-xorg-core \
    x11-utils \
    x11-xkb-utils \
    x11-xserver-utils \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxkbcommon0 \
    libxdamage1 \
    libxfixes3 \
    libxtst6 \
    libxext6 \
    libpulse0 \
    pulseaudio \
    python3 \
    python3-pip \
    python3-dev \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Selkies (low-latency browser streaming server) straight from PyPI.
# The GitHub release asset naming (selkies_gstreamer-X.Y.Z-*.whl) doesn't
# match the plain "selkies" package name, and its tags can lag behind
# what's actually published to PyPI, so pip resolving it directly is the
# more reliable path.
RUN PIP_BREAK_SYSTEM_PACKAGES=1 pip3 install --no-cache-dir selkies

# Create game user
RUN useradd -m -u 1000 gamer

# Set up display
ENV DISPLAY=:99
ENV WINE_CPU_TOPOLOGY=4:2
ENV WINEARCH=win32
ENV WINEPREFIX=/home/gamer/.wine

# Race branding (overridden per game-server in docker-compose)
ENV RACE_NAME=TERRAN

# Create directories and X11 socket directory (owned by root)
RUN mkdir -p /home/gamer/games && chown -R gamer:gamer /home/gamer && \
    mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix

# Copy SC1 files
COPY SC1/ /home/gamer/games/SC1/
RUN chown -R gamer:gamer /home/gamer/games/SC1

# Copy startup script
COPY docker/game-server/start.sh /start.sh
RUN chmod +x /start.sh

# Expose the Selkies streaming port (plain WebSocket transport - no UDP,
# STUN, or TURN needed for LAN use)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

ENTRYPOINT ["/start.sh"]
