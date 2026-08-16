#!/bin/bash

set -e

# Root-level setup (cleanup and prepare X11)
echo "Cleaning up stale X11 locks and processes..."
rm -f /tmp/.X99-lock 2>/dev/null || true
rm -f /tmp/.X11-unix/X99 2>/dev/null || true
rm -f /tmp/session-ended 2>/dev/null || true
pkill -9 Xvfb 2>/dev/null || true
pkill -9 selkies 2>/dev/null || true
pkill -9 pulseaudio 2>/dev/null || true
pkill -9 wine 2>/dev/null || true
rm -rf /home/gamer/.config/pulse /run/user/1000/pulse 2>/dev/null || true
sleep 1

# Ensure X11 socket directory exists with correct permissions
mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

# Hook script Selkies runs once the last connected client disconnects.
# It just drops a sentinel file - our own foreground loop below watches
# for it and recycles the whole container so the next player gets a
# completely fresh session.
cat > /usr/local/bin/on-disconnect.sh << 'EOF'
#!/bin/bash
touch /tmp/session-ended
EOF
chmod +x /usr/local/bin/on-disconnect.sh

# Start Xvfb (virtual X server) as root.
echo "Starting Xvfb on display :99..."
Xvfb :99 -screen 0 1024x768x24 -ac &
XVFB_PID=$!
sleep 3

# Start PulseAudio as the gamer user with a virtual sink. There's no real
# audio hardware in the container, so without this Wine has nowhere to
# render sound and just drops it (the ALSA "cannot find card 0" errors).
# Selkies captures this same sink directly - no separate audio pipeline needed.
echo "Starting PulseAudio..."
su - gamer -c "pulseaudio --start --exit-idle-time=-1 --disallow-exit" 2>&1 || true
sleep 2
su - gamer -c "pactl load-module module-null-sink sink_name=virtual_speaker sink_properties=device.description=VirtualSpeaker" 2>&1 || true
su - gamer -c "pactl set-default-sink virtual_speaker" 2>&1 || true

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

# Start Selkies: captures display :99, encodes it as H.264 over plain
# WebSockets (no GPU, no TURN/STUN needed for LAN), and streams
# PulseAudio's virtual_speaker sink alongside it in the same connection.
# Locked to StarCraft's native 640x480 so nothing is up/downscaled server
# side; the browser client scales the canvas to fit the viewport.
echo "Starting Selkies streaming server on port 8080..."
su - gamer -c "\
DISPLAY=:99 \
SELKIES_PORT=8080 \
SELKIES_ADDR=0.0.0.0 \
SELKIES_MODE=websockets \
SELKIES_ENCODER=h264enc \
SELKIES_USE_CPU=true \
SELKIES_AUDIO_ENABLED=true \
SELKIES_AUDIO_DEVICE_NAME=virtual_speaker.monitor \
SELKIES_ENABLE_BASIC_AUTH=false \
SELKIES_IS_MANUAL_RESOLUTION_MODE=true \
SELKIES_MANUAL_WIDTH=640 \
SELKIES_MANUAL_HEIGHT=480 \
SELKIES_UI_TITLE='${RACE_NAME:-TERRAN} - STARCRAFT' \
SELKIES_RUN_AFTER_DISCONNECT=/usr/local/bin/on-disconnect.sh \
selkies" \
    > /tmp/selkies.log 2>&1 &
SELKIES_PID=$!

echo "Selkies available at http://localhost:8080"

# Block here until the player disconnects (or never connects, in which
# case this just waits). Selkies runs the on-disconnect hook once the
# last client leaves, which drops /tmp/session-ended for us to notice.
echo "Waiting for player to disconnect..."
while [ ! -f /tmp/session-ended ]; do
    sleep 2
done

echo "Player disconnected - recycling container for a fresh session..."
kill -9 "$SC_PID" "$XVFB_PID" "$SELKIES_PID" 2>/dev/null || true
pkill -9 pulseaudio 2>/dev/null || true
exit 0
