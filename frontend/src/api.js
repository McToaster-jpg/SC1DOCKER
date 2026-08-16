const API_BASE = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5121`;

export const api = {
  async register(playerId, username, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, username, password })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Registration failed');
    }
    return res.json();
  },

  async login(playerId, username, password = null) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, username, password })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }
    return res.json();
  },

  async getGames() {
    const res = await fetch(`${API_BASE}/api/games`);

    if (!res.ok) throw new Error('Failed to get games');
    return res.json();
  },

  async createInstance(gameName, maxPlayers = 2) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/instance/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/instance/${instanceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to get instance');
    return res.json();
  },

  async deleteInstance(instanceId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/instance/${instanceId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete instance');
    }
    return res.json();
  }
};
