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
# Keep the virtual screen at 1024x768 - StarCraft's DirectDraw fullscreen
# switch fails on an Xvfb screen sized exactly to its own 640x480 target,
# which produced a black canvas. Instead we crop the VNC capture below.
echo "Starting Xvfb on display :99..."
Xvfb :99 -screen 0 1024x768x24 -ac &
XVFB_PID=$!
sleep 3

# Start noVNC web interface (proxies to x11vnc once it's listening)
echo "Starting noVNC..."
websockify -D --web=/usr/share/novnc/ 6080 localhost:5900 2>&1 || true
sleep 1

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

# Start x11vnc in the foreground, cropped to StarCraft's actual 640x480
# render area so there's no dead black space in the VNC canvas.
# x11vnc exits by default once its first client disconnects (no -forever),
# which we use below to recycle the whole container for the next player.
echo "Starting x11vnc..."
x11vnc -display :99 -clip 640x480+0+0 -nopw -listen localhost -rfbport 5900 &
X11VNC_PID=$!

echo "VNC available at :99 (port 5900), cropped to 640x480"
echo "noVNC available at http://localhost:6080"

# Block here until the player disconnects (or never connects, in which
# case this just waits). When x11vnc exits, tear everything down and
# exit so Docker's restart policy relaunches the container fresh.
wait $X11VNC_PID

echo "Player disconnected - recycling container for a fresh session..."
kill -9 "$SC_PID" "$XVFB_PID" 2>/dev/null || true
pkill -9 websockify 2>/dev/null || true
exit 0
