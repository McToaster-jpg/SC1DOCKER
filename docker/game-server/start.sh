#!/bin/bash

set -e

# Root-level setup (cleanup and prepare X11)
echo "Cleaning up stale X11 locks and processes..."
rm -f /tmp/.X99-lock 2>/dev/null || true
rm -f /tmp/.X11-unix/X99 2>/dev/null || true
pkill -9 Xvfb 2>/dev/null || true
pkill -9 x11vnc 2>/dev/null || true
pkill -9 websockify 2>/dev/null || true
pkill -9 pulseaudio 2>/dev/null || true
pkill -9 ffmpeg 2>/dev/null || true
pkill -9 -f status_server.py 2>/dev/null || true
rm -f /tmp/occupied 2>/dev/null || true
rm -rf /home/gamer/.config/pulse /run/user/1000/pulse 2>/dev/null || true
sleep 1

# Ensure X11 socket directory exists with correct permissions
mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

# Render the themed noVNC landing page for this race
echo "Rendering ${RACE_NAME:-TERRAN} branded page..."
envsubst '${RACE_NAME} ${RACE_COLOR} ${AUDIO_PORT}' \
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

# Start PulseAudio as the gamer user with a virtual sink. There's no real
# audio hardware in the container, so without this Wine has nowhere to
# render sound and just drops it (the ALSA "cannot find card 0" errors).
echo "Starting PulseAudio..."
su - gamer -c "pulseaudio --start --exit-idle-time=-1 --disallow-exit" 2>&1 || true
sleep 2
su - gamer -c "pactl load-module module-null-sink sink_name=virtual_speaker sink_properties=device.description=VirtualSpeaker" 2>&1 || true
su - gamer -c "pactl set-default-sink virtual_speaker" 2>&1 || true

# Stream the virtual sink out over HTTP as MP3 so the browser can play it
# alongside the VNC video via a plain <audio> tag.
echo "Starting audio stream on port 8000..."
su - gamer -c "ffmpeg -f pulse -i virtual_speaker.monitor -acodec libmp3lame -b:a 128k -f mp3 -listen 1 http://0.0.0.0:8000/audio" \
    > /tmp/ffmpeg-audio.log 2>&1 &
FFMPEG_PID=$!

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
# Perf tuning for LAN play (plenty of CPU cores, bandwidth is free):
#   -wait 10    poll every 10ms instead of the ~20-30ms default, raising
#               the achievable frame rate ceiling
#   -threads    use multiple threads for screen scanning/compression
#   -defer 10   flush updates to the client after 10ms instead of batching
#               longer, trading a little bandwidth for lower input latency
echo "Starting x11vnc..."
x11vnc -display :99 -clip 640x480+0+0 -nopw -listen localhost -rfbport 5900 \
    -wait 10 -threads -defer 10 &
X11VNC_PID=$!

echo "VNC available at :99 (port 5900), cropped to 640x480"
echo "noVNC available at http://localhost:6080"

# Serve occupancy status on port 6081, polled by the lobby so it can show
# real 0/1 vs 1/1 counts and grey out Start Game for sessions in use.
echo "Starting status server on port ${STATUS_PORT:-6081}..."
STATUS_PORT="${STATUS_PORT:-6081}" python3 /status_server.py &
STATUS_SERVER_PID=$!

# Background poller: an established TCP connection to x11vnc's port means
# a browser client is actively connected via the noVNC websocket bridge.
(
    while true; do
        if ss -tn state established '( sport = :5900 )' 2>/dev/null | tail -n +2 | grep -q .; then
            touch /tmp/occupied
        else
            rm -f /tmp/occupied
        fi
        sleep 2
    done
) &
STATUS_LOOP_PID=$!

# Block here until the player disconnects (or never connects, in which
# case this just waits). When x11vnc exits, tear everything down and
# exit so Docker's restart policy relaunches the container fresh.
wait $X11VNC_PID

echo "Player disconnected - recycling container for a fresh session..."
kill -9 "$SC_PID" "$XVFB_PID" "$FFMPEG_PID" "$STATUS_SERVER_PID" "$STATUS_LOOP_PID" 2>/dev/null || true
pkill -9 websockify 2>/dev/null || true
pkill -9 pulseaudio 2>/dev/null || true
exit 0
