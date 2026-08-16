import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Lobby from './components/Lobby';
import './index.css';

function App() {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const username = localStorage.getItem('username');
    if (username) {
      setPlayer({ username });
    }
    setLoading(false);
  }, []);

  const handleLogin = (playerData) => {
    setPlayer(playerData);
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    setPlayer(null);
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="loading">
          <div className="spinner"></div>
          <p style={{ marginTop: '20px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!player ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Lobby player={player} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
