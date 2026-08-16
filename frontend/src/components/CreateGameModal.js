import React, { useState } from 'react';

export default function CreateGameModal({ onCreate, onCancel, loading }) {
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('2');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!gameName.trim()) {
      alert('Please enter a game name');
      return;
    }
    onCreate(gameName, parseInt(maxPlayers));
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Create New Game</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="gameName">Game Name</label>
            <input
              id="gameName"
              type="text"
              placeholder="My Epic Game"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="maxPlayers">Max Players</label>
            <select
              id="maxPlayers"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0, 255, 0, 0.1)',
                border: '2px solid #00ff00',
                color: '#00ff00',
                fontSize: '14px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}
            >
              <option value="2">2 Players</option>
              <option value="3">3 Players</option>
              <option value="4">4 Players</option>
              <option value="8">8 Players</option>
            </select>
          </div>
          <div className="modal-buttons">
            <button
              type="button"
              className="modal-button btn-cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-button btn-create"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
