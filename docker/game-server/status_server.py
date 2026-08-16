#!/usr/bin/env python3
"""Tiny CORS-enabled status endpoint reporting whether a player is
currently connected. Reads a flag file that start.sh's background poller
keeps in sync with the actual VNC connection state."""
import http.server
import os

STATUS_FILE = "/tmp/occupied"
PORT = int(os.environ.get("STATUS_PORT", "6081"))


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        occupied = os.path.exists(STATUS_FILE)
        body = ('{"occupied": %s}' % ("true" if occupied else "false")).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    http.server.HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
