#!/bin/bash

set -e

# Cleanup any stale X11 locks
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true

# Create /tmp/.X11-unix if needed
mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

# Start Xvfb (virtual X server)
echo "Starting Xvfb..."
Xvfb :99 -screen 0 1024x768x24 -ac &
XVFB_PID=$!
sleep 3

# Create VNC password file
mkdir -p ~/.vnc
echo "starcraft1" | vncpasswd -f > ~/.vnc/passwd
chmod 600 ~/.vnc/passwd

# Start VNC server
echo "Starting VNC server..."
export USER=gamer
vncserver :99 -geometry 1024x768 -depth 24 -passwordfile ~/.vnc/passwd 2>&1 || true
VNC_PID=$!
sleep 3

# Start noVNC (web VNC)
echo "Starting noVNC..."
websockify -D --web=/usr/share/novnc/ 6080 localhost:5900 2>/dev/null &
NOVNC_PID=$!
sleep 2

# Launch StarCraft 1
echo "Starting StarCraft 1..."
cd /home/gamer/games/SC1

# Find the main executable
STARCRAFT_EXE=$(find . -name "*.exe" -type f | head -1)

if [ -z "$STARCRAFT_EXE" ]; then
    echo "Error: Could not find StarCraft executable"
    exit 1
fi

echo "Found executable: $STARCRAFT_EXE"

# Set Wine to 32-bit
export WINEARCH=win32
export WINEPREFIX=/home/gamer/.wine

# Run StarCraft with Wine
wine "$STARCRAFT_EXE" &
SC_PID=$!

echo "StarCraft 1 started with PID $SC_PID"
echo "VNC available at :99 (port 5900)"
echo "noVNC available at http://localhost:6080"

# Keep container running
sleep infinity
