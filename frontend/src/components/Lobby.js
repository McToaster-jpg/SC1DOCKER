import React, { useState, useEffect, useCallback } from 'react';
import { TerranEmblem, ProtossEmblem, ZergEmblem } from './Emblems';

const SESSIONS = [
  { id: 1, name: 'TERRAN', Emblem: TerranEmblem, accent: 'terran', slug: 'terran', port: 4001, statusPort: 4003 },
  { id: 2, name: 'PROTOSS', Emblem: ProtossEmblem, accent: 'protoss', slug: 'protoss', port: 4004, statusPort: 4006 },
  { id: 3, name: 'ZERG', Emblem: ZergEmblem, accent: 'zerg', slug: 'zerg', port: 4007, statusPort: 4009 }
];

const POLL_INTERVAL_MS = 3000;

// Set at build time (see frontend/Dockerfile). When present, the lobby
// builds https://<race>.<domain> style URLs that a reverse proxy (e.g.
// Nginx Proxy Manager, one proxy host per subdomain) can front with SSL -
// required because a page loaded over HTTPS can't open plain ws:///http://
// connections to other hosts/ports (mixed content). Left unset, everything
// falls back to the LAN "same host, different port" scheme.
const PUBLIC_DOMAIN = process.env.REACT_APP_PUBLIC_DOMAIN || '';

function gameOrigin(slug) {
  return PUBLIC_DOMAIN ? `https://${slug}.${PUBLIC_DOMAIN}` : null;
}

function statusOrigin(slug) {
  return PUBLIC_DOMAIN ? `https://${slug}-status.${PUBLIC_DOMAIN}` : null;
}

export default function Lobby({ player, onLogout }) {
  const [connecting, setConnecting] = useState(null);
  const [error, setError] = useState('');
  const [occupied, setOccupied] = useState({});

  const pollStatus = useCallback(async () => {
    const results = await Promise.all(
      SESSIONS.map(async (session) => {
        try {
          const base = statusOrigin(session.slug) || `http://${window.location.hostname}:${session.statusPort}`;
          const res = await fetch(`${base}/status?t=${Date.now()}`);
          if (!res.ok) return [session.id, false];
          const data = await res.json();
          return [session.id, !!data.occupied];
        } catch {
          // Container still booting or unreachable - treat as available
          // rather than falsely blocking players.
          return [session.id, false];
        }
      })
    );
    setOccupied(Object.fromEntries(results));
  }, []);

  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollStatus]);

  const handleJoinSession = (session) => {
    setError('');
    setConnecting(session.id);

    setTimeout(() => {
      // Cache-bust: force a fresh navigation instead of a stale cached page
      const base = gameOrigin(session.slug) || `http://${window.location.hostname}:${session.port}`;
      window.open(`${base}/?t=${Date.now()}`, '_blank');
      setConnecting(null);
    }, 1200);
  };

  return (
    <div className="lobby-container">
      <div className="starfield" aria-hidden="true"></div>
      <div className="lobby-header">
        <div className="header-content">
          <h1>STARCRAFT</h1>
          <p className="subtitle">SESSION SELECT</p>
        </div>
        <div className="player-panel">
          <div className="player-name">{player.username}</div>
          <button className="logout-button" onClick={onLogout}>
            LOGOUT
          </button>
        </div>
      </div>

      {error && <div className="error-message">⚠ {error}</div>}

      <div className="sessions-container">
        <div className="sessions-grid">
          {SESSIONS.map(session => {
            const { Emblem } = session;
            const inUse = !!occupied[session.id];
            return (
              <div
                key={session.id}
                className={`session-card session-${session.accent} ${connecting === session.id ? 'connecting' : ''}`}
              >
                <div className="session-header">
                  <Emblem className="race-emblem" />
                  <h2>{session.name}</h2>
                </div>

                <div className="session-info">
                  <p className="info-line">RACE: <span>{session.name}</span></p>
                  <p className="info-line">STATUS: <span className="online">● ONLINE</span></p>
                  <p className="info-line">PLAYERS: <span>{inUse ? '1/1' : '0/1'}</span></p>
                </div>

                <div className="session-status">
                  {connecting === session.id ? (
                    <div className="connecting-animation">
                      <span>⟳ CONNECTING...</span>
                    </div>
                  ) : (
                    <button
                      className="join-button"
                      onClick={() => handleJoinSession(session)}
                      disabled={inUse}
                    >
                      {inUse ? '🔒 IN USE' : '▶ START GAME'}
                    </button>
                  )}
                </div>

                <div className="map-info">
                  CLASSIC MAP
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="footer-info">
        <p>Local Session | Ping: &lt;50ms</p>
      </div>
    </div>
  );
}
