# Authentication Guide

The SC1DOCKER server uses JWT (JSON Web Tokens) for player authentication. All game instance endpoints require a valid token.

## How It Works

1. Player logs in with `playerId` and `username`
2. Server returns a JWT token (valid for 24 hours)
3. Player includes token in `Authorization` header for API requests
4. Server verifies token and grants access to game instances

## Environment Setup

### 1. Set JWT Secret

**Important**: Change the default secret in production!

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set a strong secret:

```env
JWT_SECRET=your-super-secret-key-min-32-chars-recommended
```

In Docker:

```yaml
# docker-compose.yml
environment:
  - JWT_SECRET=${JWT_SECRET:-default-secret}
```

Or set it directly:

```bash
export JWT_SECRET="your-secret-key"
docker-compose up -d
```

## API Endpoints

### Login (No Authentication Required)

**Endpoint**: `POST /api/auth/login`

**Request**:
```json
{
  "playerId": "player123",
  "username": "PlayerName"
}
```

**Response**:
```json
{
  "token": "eyJhbGc...",
  "expiresIn": 86400
}
```

**Example**:
```bash
curl -X POST http://localhost:5121/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player123","username":"Player One"}'
```

### Create Game Instance (Requires Token)

**Endpoint**: `POST /api/instance/create`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "gameName": "MyGame",
  "maxPlayers": 2
}
```

**Response**:
```json
{
  "instanceId": "sc1-1692115200000",
  "playerId": "player123",
  "port": 5800,
  "host": "localhost",
  "url": "http://localhost:5800",
  "createdAt": "2024-08-15T12:00:00.000Z"
}
```

**Example**:
```bash
# 1. Login first
TOKEN=$(curl -X POST http://localhost:5121/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player123","username":"Player One"}' \
  | jq -r '.token')

# 2. Create instance with token
curl -X POST http://localhost:5121/api/instance/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gameName":"MyGame","maxPlayers":2}'
```

### Get Instance Info (Requires Token)

**Endpoint**: `GET /api/instance/<instanceId>`

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "instanceId": "sc1-1692115200000",
  "playerId": "player123",
  "status": "running",
  "createdAt": "2024-08-15T12:00:00.000Z"
}
```

### Delete Instance (Requires Token)

**Endpoint**: `DELETE /api/instance/<instanceId>`

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "message": "Instance terminated",
  "instanceId": "sc1-1692115200000"
}
```

## Frontend Integration

### JavaScript Example

```javascript
// Login
async function login(playerId, username) {
  const res = await fetch('http://localhost:5121/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, username })
  });
  const { token } = await res.json();
  localStorage.setItem('token', token);
  return token;
}

// Create game instance
async function createGame(gameName) {
  const token = localStorage.getItem('token');
  const res = await fetch('http://localhost:5121/api/instance/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ gameName })
  });
  return res.json();
}

// Get instance info
async function getInstanceInfo(instanceId) {
  const token = localStorage.getItem('token');
  const res = await fetch(`http://localhost:5121/api/instance/${instanceId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

// Delete instance
async function deleteInstance(instanceId) {
  const token = localStorage.getItem('token');
  const res = await fetch(`http://localhost:5121/api/instance/${instanceId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}

// Example usage
(async () => {
  const token = await login('player-123', 'Alice');
  const instance = await createGame('My Game');
  console.log('Instance running at:', instance.url);
})();
```

### React Example

```jsx
import { useState, useEffect } from 'react';

function GameLobby() {
  const [token, setToken] = useState(null);
  const [instances, setInstances] = useState([]);

  const login = async (playerId, username) => {
    const res = await fetch('http://localhost:5121/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, username })
    });
    const { token } = await res.json();
    setToken(token);
    localStorage.setItem('token', token);
  };

  const createGame = async () => {
    const res = await fetch('http://localhost:5121/api/instance/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameName: 'New Game' })
    });
    const instance = await res.json();
    setInstances([...instances, instance]);
  };

  if (!token) {
    return (
      <button onClick={() => login('player-1', 'You')}>
        Login
      </button>
    );
  }

  return (
    <div>
      <button onClick={createGame}>Create Game</button>
      <ul>
        {instances.map(inst => (
          <li key={inst.instanceId}>
            <a href={inst.url} target="_blank">
              {inst.instanceId} on port {inst.port}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Security Notes

- **JWT_SECRET**: Use a strong, random secret (minimum 32 characters)
- **HTTPS**: Always use HTTPS in production (use nginx proxy manager for SSL)
- **Token Expiry**: Tokens expire after 24 hours, user must re-login
- **CORS**: Currently allows all origins, restrict to your domain in production
- **Rate Limiting**: Consider adding rate limiting to login endpoint

### Production Checklist

- [ ] Set strong `JWT_SECRET` environment variable
- [ ] Enable HTTPS/SSL (use nginx proxy manager)
- [ ] Restrict CORS to your domain
- [ ] Add rate limiting on login endpoint
- [ ] Implement database to persist player sessions
- [ ] Add refresh token mechanism for better UX
- [ ] Log authentication attempts for security audit
- [ ] Add password-based authentication (optional)
- [ ] Implement 2FA (optional)

## Troubleshooting

### "Unauthorized" when creating instance

```bash
# Token might be expired or malformed
# 1. Check token is being sent correctly
curl -H "Authorization: Bearer <your-token>" http://localhost:5121/api/instance/123

# 2. Try logging in again
curl -X POST http://localhost:5121/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player1","username":"Player"}'
```

### CORS errors in browser

Add your frontend domain to CORS headers in `server.js`:

```javascript
res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com');
```

### Token validation fails

Check that `JWT_SECRET` is the same in your docker-compose.yml:

```bash
# Print currently set secret
docker-compose exec game-orchestrator printenv JWT_SECRET
```

## Advanced: Refresh Tokens

To implement persistent login without 24-hour re-login requirement:

```javascript
// Generate refresh token (longer expiry)
function generateRefreshToken(playerId) {
  const exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  return generateToken(playerId, exp);
}

// Endpoint to refresh access token
// POST /api/auth/refresh { refreshToken }
```

See `server.js` for JWT implementation details to extend.
