#!/bin/bash

set -e

# Root-level setup (cleanup and prepare X11)
echo "Cleaning up stale X11 locks and processes..."
rm -f /tmp/.X99-lock 2>/dev/null || true
rm -f /tmp/.X11-unix/X99 2>/dev/null || true
pkill -9 Xvfb 2>/dev/null || true
pkill -9 x11vnc 2>/dev/null || true
pkill -9 websockify 2>/dev/null || true
sleep 1

# Ensure X11 socket directory exists with correct permissions
mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

# Render the themed noVNC landing page for this race
echo "Rendering ${RACE_NAME:-TERRAN} branded page..."
envsubst '${RACE_NAME} ${RACE_COLOR}' \
    < /usr/share/novnc/index.html.template \
    > /usr/share/novnc/index.html

RACE_LOWER=$(echo "${RACE_NAME:-TERRAN}" | tr '[:upper:]' '[:lower:]')
cp "/usr/share/novnc/emblems/${RACE_LOWER}.svg" /usr/share/novnc/emblem.svg

# Start Xvfb (virtual X server) as root.
# 640x480 matches StarCraft 1's native resolution so the VNC canvas has
# no dead black space around the game window.
echo "Starting Xvfb on display :99..."
Xvfb :99 -screen 0 640x480x24 -ac &
XVFB_PID=$!
sleep 3

# Start x11vnc to stream the Xvfb display (no password for local streaming)
echo "Starting x11vnc..."
x11vnc -display :99 -nopw -listen localhost -rfbport 5900 -bg 2>&1 || true
sleep 2

# Start noVNC web interface pointing to x11vnc
echo "Starting noVNC..."
websockify -D --web=/usr/share/novnc/ 6080 localhost:5900 2>&1 || true
sleep 2

# Find the SC1 executable
echo "Starting StarCraft 1..."
cd /home/gamer/games/SC1

STARCRAFT_EXE=$(find . -name "*.exe" -type f | head -1)

if [ -z "$STARCRAFT_EXE" ]; then
    echo "Error: Could not find StarCraft executable"
    exit 1
fi

echo "Found executable: $STARCRAFT_EXE"

# Run StarCraft with Wine as gamer user with explicit display and wine settings
su - gamer -c "DISPLAY=:99 WINEARCH=win32 WINEPREFIX=/home/gamer/.wine wine '/home/gamer/games/SC1/$STARCRAFT_EXE'" &
SC_PID=$!

echo "StarCraft 1 started with PID $SC_PID"
echo "VNC available at :99 (port 5900)"
echo "noVNC available at http://localhost:6080"

# Keep container running
sleep infinity
