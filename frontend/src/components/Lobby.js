import React, { useState } from 'react';

const SESSIONS = [
  { id: 1, name: 'TERRAN', race: '🦅', port: 6122, status: 'online' },
  { id: 2, name: 'PROTOSS', race: '⚡', port: 6223, status: 'online' },
  { id: 3, name: 'ZERG', race: '🐛', port: 6324, status: 'online' }
];

export default function Lobby({ player, onLogout }) {
  const [connecting, setConnecting] = useState(null);
  const [error, setError] = useState('');

  const handleJoinSession = (session) => {
    setError('');
    setConnecting(session.id);

    // Simulate connection and open game
    setTimeout(() => {
      window.open(`http://${window.location.hostname}:${session.port}`, '_blank');
      setConnecting(null);
    }, 1500);
  };

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <div className="header-content">
          <h1>STARCRAFT BROOD WAR</h1>
          <p className="subtitle">BATTLE.NET SESSION SELECTOR</p>
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
          {SESSIONS.map(session => (
            <div key={session.id} className={`session-card ${connecting === session.id ? 'connecting' : ''}`}>
              <div className="session-header">
                <div className="race-icon">{session.race}</div>
                <h2>{session.name}</h2>
              </div>

              <div className="session-info">
                <p className="info-line">RACE: <span>{session.name}</span></p>
                <p className="info-line">STATUS: <span className="online">● ONLINE</span></p>
                <p className="info-line">PLAYERS: <span>1/1</span></p>
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
                  >
                    ▶ START GAME
                  </button>
                )}
              </div>

              <div className="map-info">
                CLASSIC MAP
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="footer-info">
        <p>Connected to StarCraft Battle.Net | Ping: &lt;50ms</p>
      </div>
    </div>
  );
}
