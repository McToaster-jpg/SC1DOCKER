import React, { useState } from 'react';
import { api } from '../api';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!username.trim()) {
        setError('Enter a player name');
        setLoading(false);
        return;
      }

      localStorage.setItem('username', username);
      onLogin({ username });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="logo">⚔️</div>
          <h1>STARCRAFT</h1>
          <p className="tagline">BROOD WAR</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>PLAYER NAME</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '▌▌ CONNECTING...' : '▶ ENTER GAME'}
          </button>
        </form>

        {error && <div className="error-message">⚠ {error}</div>}

        <div className="login-footer">
          <p>v1.0 | MULTIPLAYER BETA</p>
        </div>
      </div>
    </div>
  );
}
