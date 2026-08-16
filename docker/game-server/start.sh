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

# Setup gamer user environment
export HOME=/home/gamer
export USER=gamer
export DISPLAY=:99
export WINEARCH=win32
export WINEPREFIX=/home/gamer/.wine

# Create VNC password file
mkdir -p /home/gamer/.vnc
echo "starcraft1" | vncpasswd -f > /home/gamer/.vnc/passwd
chmod 600 /home/gamer/.vnc/passwd

# Start VNC server
echo "Starting VNC server..."
su - gamer -c "vncserver :99 -geometry 1024x768 -depth 24 -passwordfile ~/.vnc/passwd" 2>&1 || true
sleep 3

# Start noVNC (web VNC)
echo "Starting noVNC..."
websockify -D --web=/usr/share/novnc/ 6080 localhost:5900 2>/dev/null &
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

# Run StarCraft with Wine as gamer user
su - gamer -c "cd /home/gamer/games/SC1 && wine '$STARCRAFT_EXE'" &
SC_PID=$!

echo "StarCraft 1 started with PID $SC_PID"
echo "VNC available at :99 (port 5900)"
echo "noVNC available at http://localhost:6080"

# Keep container running
sleep infinity
