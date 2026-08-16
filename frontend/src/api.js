const API_BASE = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5121`;

export const api = {
  async getGames() {
    const res = await fetch(`${API_BASE}/api/games`);
    if (!res.ok) throw new Error('Failed to get games');
    return res.json();
  },

  async createInstance(gameName, maxPlayers = 2) {
    const username = localStorage.getItem('username');
    const res = await fetch(`${API_BASE}/api/instance/create`, {
      method: 'POST',
      headers: {
        'X-Player-Name': username,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameName, maxPlayers })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create game');
    }
    return res.json();
  },

  async getInstance(instanceId) {
    const username = localStorage.getItem('username');
    const res = await fetch(`${API_BASE}/api/instance/${instanceId}`, {
      headers: { 'X-Player-Name': username }
    });

    if (!res.ok) throw new Error('Failed to get instance');
    return res.json();
  },

  async deleteInstance(instanceId) {
    const username = localStorage.getItem('username');
    const res = await fetch(`${API_BASE}/api/instance/${instanceId}`, {
      method: 'DELETE',
      headers: { 'X-Player-Name': username }
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete instance');
    }
    return res.json();
  }
};
