#!/bin/bash

# Start Xvfb (virtual X server)
echo "Starting Xvfb..."
Xvfb :99 -screen 0 1024x768x24 &
XVFB_PID=$!
sleep 2

# Create VNC password file
mkdir -p ~/.vnc
echo "starcraft1" | vncpasswd -f > ~/.vnc/passwd
chmod 600 ~/.vnc/passwd

# Start VNC server
echo "Starting VNC server..."
vncserver :99 -geometry 1024x768 -depth 24 -passwordfile ~/.vnc/passwd
VNC_PID=$!
sleep 2

# Start noVNC (web VNC)
echo "Starting noVNC..."
websockify -D --web=/usr/share/novnc/ --cert=/self-signed.pem 6080 localhost:5900 2>/dev/null &
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

# Run StarCraft with Wine
wine "$STARCRAFT_EXE" &
SC_PID=$!

echo "StarCraft 1 started with PID $SC_PID"
echo "VNC available at :99 (port 5900)"
echo "noVNC available at http://localhost:6080"

# Wait for processes
wait $SC_PID

# Cleanup
echo "StarCraft closed, shutting down..."
kill $NOVNC_PID 2>/dev/null || true
kill $VNC_PID 2>/dev/null || true
kill $XVFB_PID 2>/dev/null || true

exit 0
