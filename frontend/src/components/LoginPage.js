import React, { useState } from 'react';
import { api } from '../api';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [playerId, setPlayerId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!playerId.trim() || !username.trim()) {
        setError('Player ID and Username are required');
        setLoading(false);
        return;
      }

      if (mode === 'register') {
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        const { token } = await api.register(playerId, username, password);
        localStorage.setItem('token', token);
        localStorage.setItem('playerId', playerId);
        localStorage.setItem('username', username);
        onLogin({ playerId, username });
      } else {
        // Login mode
        const { token } = await api.login(playerId, username, password);
        localStorage.setItem('token', token);
        localStorage.setItem('playerId', playerId);
        localStorage.setItem('username', username);
        onLogin({ playerId, username });
      }
    } catch (err) {
      setError(err.message || (mode === 'register' ? 'Registration failed' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>SC1</h1>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '10px',
              background: mode === 'login' ? '#00ff00' : 'transparent',
              color: mode === 'login' ? '#0a0e27' : '#00ff00',
              border: '2px solid #00ff00',
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: '12px',
              borderRadius: '4px',
              transition: 'all 0.3s'
            }}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '10px',
              background: mode === 'register' ? '#00ff00' : 'transparent',
              color: mode === 'register' ? '#0a0e27' : '#00ff00',
              border: '2px solid #00ff00',
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: '12px',
              borderRadius: '4px',
              transition: 'all 0.3s'
            }}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="playerId">Player ID</label>
            <input
              id="playerId"
              type="text"
              placeholder="player123"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Your Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          )}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Processing...' : mode === 'register' ? 'Create Account' : 'Login'}
          </button>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}
