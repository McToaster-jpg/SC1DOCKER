# Game Server Container - Runs StarCraft 1 with VNC streaming
FROM ubuntu:22.04

# Skip interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
RUN ln -fs /usr/share/zoneinfo/UTC /etc/localtime

# Install dependencies
RUN apt-get update && apt-get install -y \
    wine \
    xvfb \
    tightvncserver \
    novnc \
    websockify \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create game user
RUN useradd -m -u 1000 gamer

# Set up VNC and display
ENV DISPLAY=:99
ENV WINE_CPU_TOPOLOGY=4:2
ENV WINEARCH=win32
ENV WINEPREFIX=/home/gamer/.wine

# Create directories
RUN mkdir -p /home/gamer/games && chown -R gamer:gamer /home/gamer

# Copy SC1 files
COPY SC1/ /home/gamer/games/SC1/
RUN chown -R gamer:gamer /home/gamer/games/SC1

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose VNC port
EXPOSE 5900
EXPOSE 6080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:6080/vnc.html || exit 1

# Run as gamer user
USER gamer

ENTRYPOINT ["/start.sh"]
