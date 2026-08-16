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

# Stream that sink's monitor out as RAW PCM over a plain TCP socket - no
# encoder, no container format, no muxer. This replaced an ffmpeg/MP3 (then
# Opus) HTTP pipeline that was still several seconds behind even after
# stripping every buffering flag ffmpeg exposes, because the real bottleneck
# was the browser's own <audio src> element: it applies conservative
# buffering to any indefinite, non-seekable HTTP stream by design, and
# there's no way to override that from the server side.
# module-simple-protocol-tcp is a real persistent server (unlike ffmpeg's
# one-shot -listen), so it can just stay up for the container's whole
# lifetime like everything else - and since there's no encoder queue,
# there's no backlog-buildup class of bug possible here either.
echo "Starting raw PCM audio TCP server..."
su - gamer -c "pactl load-module module-simple-protocol-tcp rate=48000 format=s16le channels=2 source=virtual_speaker.monitor record=true playback=false port=9001 listen=127.0.0.1" 2>&1 || true

# Bridge that raw TCP audio stream to a WebSocket, same pattern already
# used for VNC. The browser side reads this via the Web Audio API and
# schedules playback directly, bypassing <audio>'s buffering entirely.
echo "Starting audio WebSocket bridge on port 8000..."
websockify -D 8000 localhost:9001 2>&1 || true

# x11vnc now stays up for the container's whole lifetime (-forever) instead
# of exiting after the first disconnect. StarCraft itself - not the whole
# container - is what cycles on join/leave now, so there's no need to
# recycle the streaming stack on every session anymore.
# Perf tuning for LAN play (plenty of CPU cores, bandwidth is free):
#   -wait 10    poll every 10ms instead of the ~20-30ms default, raising
#               the achievable frame rate ceiling
#   -threads    use multiple threads for screen scanning/compression
#   -defer 10   flush updates to the client after 10ms instead of batching
#               longer, trading a little bandwidth for lower input latency
echo "Starting x11vnc..."
x11vnc -display :99 -clip 640x480+0+0 -nopw -listen localhost -rfbport 5900 \
    -wait 10 -threads -defer 10 -forever &

echo "noVNC available at http://localhost:6080"

# Serve occupancy status on port 6081, polled by the lobby so it can show
# real 0/1 vs 1/1 counts and grey out Start Game for sessions in use.
echo "Starting status server on port ${STATUS_PORT:-6081}..."
STATUS_PORT="${STATUS_PORT:-6081}" python3 /status_server.py &

# Find the SC1 executable once - start/stop cycles below just reuse this.
cd /home/gamer/games/SC1
STARCRAFT_EXE=$(find . -name "*.exe" -type f | head -1)

if [ -z "$STARCRAFT_EXE" ]; then
    echo "Error: Could not find StarCraft executable"
    exit 1
fi

echo "Found executable: $STARCRAFT_EXE"

# Lazy start/stop loop: an established TCP connection to x11vnc's port
# means a browser client is actively connected via the noVNC websocket
# bridge. StarCraft only actually runs while someone's connected - an
# idle session costs next to nothing instead of burning CPU on the menu
# screen animation with nobody watching. (Audio no longer needs this
# treatment - see above.)
GAME_RUNNING=0
SC_PID=""
echo "Idle - waiting for a player to connect..."

while true; do
    if ss -tn state established '( sport = :5900 )' 2>/dev/null | tail -n +2 | grep -q .; then
        CONNECTED=1
    else
        CONNECTED=0
    fi

    if [ "$CONNECTED" = "1" ] && [ "$GAME_RUNNING" = "0" ]; then
        echo "Player connected - starting StarCraft 1..."
        touch /tmp/occupied
        su - gamer -c "DISPLAY=:99 WINEARCH=win32 WINEPREFIX=/home/gamer/.wine wine '/home/gamer/games/SC1/$STARCRAFT_EXE'" &
        SC_PID=$!
        GAME_RUNNING=1
    elif [ "$CONNECTED" = "0" ] && [ "$GAME_RUNNING" = "1" ]; then
        echo "Player disconnected - stopping StarCraft 1, back to idle..."
        rm -f /tmp/occupied
        kill -9 "$SC_PID" 2>/dev/null || true
        su - gamer -c "WINEPREFIX=/home/gamer/.wine wineserver -k" 2>/dev/null || true
        wait "$SC_PID" 2>/dev/null || true
        SC_PID=""
        GAME_RUNNING=0
        echo "Idle - waiting for a player to connect..."
    elif [ "$CONNECTED" = "1" ]; then
        touch /tmp/occupied
    fi

    sleep 2
done
