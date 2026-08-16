#!/bin/bash

set -e

# Root-level setup (cleanup and prepare X11)
echo "Cleaning up stale X11 locks..."
rm -f /tmp/.X99-lock 2>/dev/null || true
pkill -f Xvfb 2>/dev/null || true
pkill -f vncserver 2>/dev/null || true
sleep 1

# Ensure X11 socket directory exists with correct permissions
mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

# Start Xvfb (virtual X server) as root
echo "Starting Xvfb..."
Xvfb :99 -screen 0 1024x768x24 -ac &
XVFB_PID=$!
sleep 3

# Create VNC directory as root with proper permissions for gamer
mkdir -p /home/gamer/.vnc
chown gamer:gamer /home/gamer/.vnc
chmod 700 /home/gamer/.vnc

# Create VNC password file as gamer user
echo "starcraft1" | su - gamer -c "vncpasswd -f > ~/.vnc/passwd && chmod 600 ~/.vnc/passwd"

# Start VNC server with explicit DISPLAY
echo "Starting VNC server..."
su - gamer -c "DISPLAY=:99 vncserver :99 -geometry 1024x768 -depth 24 -passwordfile ~/.vnc/passwd" 2>&1 || true
sleep 3

# Start noVNC (web VNC)
echo "Starting noVNC..."
websockify -D --web=/usr/share/novnc/ 6080 localhost:5900 2>/dev/null &
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
