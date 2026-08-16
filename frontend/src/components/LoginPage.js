import React, { useState } from 'react';
import { api } from '../api';

export default function LoginPage({ onLogin }) {
  const [playerId, setPlayerId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!playerId.trim() || !username.trim() || !password.trim()) {
        setError('All fields required');
        setLoading(false);
        return;
      }

      const { token } = await api.login(playerId, username, password);
      localStorage.setItem('token', token);
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('username', username);
      onLogin({ playerId, username });
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
            <label>PLAYER ID</label>
            <input
              type="text"
              placeholder="Enter your ID"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>USERNAME</label>
            <input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>PASSWORD</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
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
