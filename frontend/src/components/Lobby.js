import React, { useState, useEffect } from 'react';
import { api } from '../api';
import CreateGameModal from './CreateGameModal';

export default function Lobby({ player, onLogout }) {
  const [games, setGames] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGames();
    const interval = setInterval(loadGames, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadGames = async () => {
    try {
      const data = await api.getGames();
      // Transform database format to UI format
      const transformedGames = data.games.map(g => ({
        instanceId: g.instance_id,
        game_name: g.game_name,
        host: g.host_name,
        maxPlayers: g.max_players,
        currentPlayers: g.current_players,
        status: g.status,
        port: g.port,
        url: `http://localhost:${g.port}`,
        createdAt: new Date(g.created_at).toLocaleTimeString(),
        host_player_id: g.host_player_id
      }));
      setGames(transformedGames);
    } catch (err) {
      console.error('Failed to load games:', err);
    }
  };

  const handleCreateGame = async (gameName, maxPlayers) => {
    setError('');
    setLoading(true);

    try {
      await api.createInstance(gameName, maxPlayers);
      await loadGames(); // Reload games from database
      setShowCreateModal(false);
    } catch (err) {
      setError(err.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (game) => {
    try {
      // In a real app, this would add the player to the game instance
      // For now, just redirect to the game URL
      window.open(game.url, '_blank');
    } catch (err) {
      setError(err.message || 'Failed to join game');
    }
  };

  const handleLeaveGame = async (instanceId) => {
    try {
      console.log('Attempting to delete instance:', instanceId);
      await api.deleteInstance(instanceId);
      await loadGames(); // Reload games from database
      console.log('Game deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to end game');
    }
  };

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h1>StarCraft 1</h1>
        <div className="player-info">
          <div className="player-name">👤 {player.username}</div>
          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

      <div className="lobby-content">
        <div
          className="create-game-card"
          onClick={() => setShowCreateModal(true)}
        >
          <h2>+ New Game</h2>
        </div>

        {games.map(game => (
          <div key={game.instanceId} className="game-card">
            <div className="game-header">
              <div className="game-name">{game.game_name}</div>
              <div className="game-info">
                <p>Host: {game.host}</p>
                <p>Players: {game.currentPlayers}/{game.maxPlayers}</p>
                <p>Port: {game.port}</p>
              </div>
            </div>

            <div className="game-status">
              Status: <span style={{ color: '#00ff00' }}>● Running</span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="join-button"
                onClick={() => handleJoinGame(game)}
                style={{ flex: 1 }}
              >
                Join Game
              </button>
              {game.host_player_id === localStorage.getItem('playerId') && (
                <button
                  className="join-button"
                  onClick={() => handleLeaveGame(game.instanceId)}
                  style={{
                    flex: 1,
                    background: '#ff3333'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#dd0000'}
                  onMouseLeave={(e) => e.target.style.background = '#ff3333'}
                >
                  End Game
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <CreateGameModal
          onCreate={handleCreateGame}
          onCancel={() => setShowCreateModal(false)}
          loading={loading}
        />
      )}
    </div>
  );
}
