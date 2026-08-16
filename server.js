const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const Docker = require('dockerode');

const PORT = process.env.PORT || 5121;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DOCKER_SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock';

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sc1_games',
  user: process.env.DB_USER || 'sc1_user',
  password: process.env.DB_PASSWORD || 'sc1_password',
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

// Docker Client
const docker = new Docker({ socketPath: DOCKER_SOCKET });

// Helper function to spawn game container
async function spawnGameContainer(instanceId, port) {
  try {
    console.log(`Spawning game container for ${instanceId} on port ${port}`);

    const container = await docker.createContainer({
      Image: 'sc1-game-server:latest',
      name: `sc1-game-${instanceId}`,
      HostConfig: {
        PortBindings: {
          '6080/tcp': [{ HostPort: port.toString() }],
          '5900/tcp': [{ HostPort: (port + 1000).toString() }]
        },
        NetworkMode: 'sc1-network'
      },
      Env: [
        'DISPLAY=:99'
      ],
      ExposedPorts: {
        '6080/tcp': {},
        '5900/tcp': {}
      }
    });

    await container.start();
    console.log(`Container started for ${instanceId}`);
    return true;
  } catch (err) {
    console.error(`Failed to spawn container for ${instanceId}:`, err.message);
    return false;
  }
}

// Helper function to stop game container
async function stopGameContainer(instanceId) {
  try {
    console.log(`Stopping game container for ${instanceId}`);
    const container = docker.getContainer(`sc1-game-${instanceId}`);
    await container.stop({ t: 10 });
    await container.remove();
    console.log(`Container removed for ${instanceId}`);
    return true;
  } catch (err) {
    console.error(`Failed to stop container for ${instanceId}:`, err.message);
    return false;
  }
}

// JWT Functions
function generateToken(playerId) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    playerId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;

  try {
    const [header, payload, signature] = token.split('.');

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url'));

    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return decoded;
  } catch {
    return null;
  }
}

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try {
      callback(null, body ? JSON.parse(body) : {});
    } catch (err) {
      callback(err);
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>StarCraft 1 HTML5</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #00ff00; }
            h1 { color: #00ff00; text-shadow: 0 0 10px #00ff00; }
            .status { margin-top: 20px; padding: 20px; background: #0a0a0a; border: 1px solid #00ff00; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>StarCraft 1 - HTML5 Game Server</h1>
          <div class="status">
            <p>✓ Server is running!</p>
            <p>✓ Database connected!</p>
            <p>Connect via the web frontend to play.</p>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // Registration endpoint (no auth required)
  if (pathname === '/api/auth/register') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    parseBody(req, async (err, body) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }

      const { playerId, username, password } = body;
      if (!playerId || !username || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'playerId, username, and password required' }));
        return;
      }

      try {
        // Check if player already exists
        const existing = await pool.query('SELECT id FROM users WHERE player_id = $1', [playerId]);
        if (existing.rows.length > 0) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Player already exists' }));
          return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert new user
        await pool.query(
          'INSERT INTO users (player_id, username, password_hash) VALUES ($1, $2, $3)',
          [playerId, username, passwordHash]
        );

        const token = generateToken(playerId);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token, expiresIn: 86400 }));
      } catch (dbErr) {
        console.error('Registration error:', dbErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Registration failed' }));
      }
    });
    return;
  }

  // Login endpoint (no auth required)
  if (pathname === '/api/auth/login') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    parseBody(req, async (err, body) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }

      const { playerId, username, password } = body;

      try {
        // Check if user exists with password (new login flow)
        if (password) {
          const user = await pool.query('SELECT * FROM users WHERE player_id = $1', [playerId]);
          if (user.rows.length === 0) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid credentials' }));
            return;
          }

          const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
          if (!validPassword) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid credentials' }));
            return;
          }

          const token = generateToken(playerId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ token, expiresIn: 86400, username: user.rows[0].username }));
          return;
        }

        // Fallback: Guest login (no password)
        if (!playerId || !username) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'playerId and username required' }));
          return;
        }

        // Create or get user for guest login
        const user = await pool.query('SELECT * FROM users WHERE player_id = $1', [playerId]);
        if (user.rows.length === 0) {
          await pool.query(
            'INSERT INTO users (player_id, username) VALUES ($1, $2)',
            [playerId, username]
          );
        }

        const token = generateToken(playerId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token, expiresIn: 86400 }));
      } catch (dbErr) {
        console.error('Login error:', dbErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Login failed' }));
      }
    });
    return;
  }

  // Get auth token from header
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const auth = verifyToken(token);

  // Get active games (no auth required for viewing)
  if (pathname === '/api/games' && req.method === 'GET') {
    (async () => {
      try {
        const result = await pool.query(
          `SELECT g.*, u.username as host_name
           FROM game_instances g
           JOIN users u ON g.host_player_id = u.player_id
           WHERE g.status = 'running'
           ORDER BY g.created_at DESC`
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ games: result.rows }));
      } catch (dbErr) {
        console.error('Get games error:', dbErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to get games' }));
      }
    })();
    return;
  }

  // Protected endpoints below
  if (!auth) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  // Create game instance
  if (pathname === '/api/instance/create') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    parseBody(req, async (err, body) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }

      const { gameName, maxPlayers } = body;
      const instanceId = 'sc1-' + Date.now();
      const port = 6122 + Math.floor(Math.random() * 800); // Use higher port range

      try {
        // Insert game instance into database
        const result = await pool.query(
          `INSERT INTO game_instances (instance_id, game_name, host_player_id, max_players, port)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [instanceId, gameName || 'Game', auth.playerId, maxPlayers || 2, port]
        );

        // Add host to player_game_sessions
        await pool.query(
          `INSERT INTO player_game_sessions (instance_id, player_id)
           VALUES ($1, $2)`,
          [instanceId, auth.playerId]
        );

        // Spawn Docker container for game instance
        const containerSpawned = await spawnGameContainer(instanceId, port);

        if (!containerSpawned) {
          // Clean up database if container spawn failed
          await pool.query('DELETE FROM game_instances WHERE instance_id = $1', [instanceId]);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to start game container' }));
          return;
        }

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          instanceId,
          playerId: auth.playerId,
          port,
          host: 'localhost',
          url: `http://192.168.0.12:${port}`,
          createdAt: new Date().toISOString(),
          containerStarting: true
        }));
      } catch (dbErr) {
        console.error('Create instance error:', dbErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to create game' }));
      }
    });
    return;
  }

  // Get instance info
  if (pathname.startsWith('/api/instance/') && req.method === 'GET') {
    const instanceId = pathname.split('/')[3];

    (async () => {
      try {
        const result = await pool.query(
          'SELECT * FROM game_instances WHERE instance_id = $1',
          [instanceId]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Instance not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.rows[0]));
      } catch (dbErr) {
        console.error('Get instance error:', dbErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to get instance' }));
      }
    })();
    return;
  }

  // Delete instance (end game)
  if (pathname.startsWith('/api/instance/') && req.method === 'DELETE') {
    const instanceId = pathname.split('/')[3];

    (async () => {
      try {
        // Check if player is host
        const result = await pool.query(
          'SELECT * FROM game_instances WHERE instance_id = $1',
          [instanceId]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Instance not found' }));
          return;
        }

        const game = result.rows[0];
        if (game.host_player_id !== auth.playerId) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Only host can end game' }));
          return;
        }

        // Stop Docker container
        await stopGameContainer(instanceId);

        // Update game status to ended
        await pool.query(
          'UPDATE game_instances SET status = $1, ended_at = $2 WHERE instance_id = $3',
          ['ended', new Date(), instanceId]
        );

        // Remove all players from session
        await pool.query(
          'UPDATE player_game_sessions SET left_at = $1 WHERE instance_id = $2 AND left_at IS NULL',
          [new Date(), instanceId]
        );

        console.log(`Game ended: ${instanceId} by player: ${auth.playerId}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Instance terminated', instanceId }));
      } catch (dbErr) {
        console.error('Delete instance error:', dbErr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to delete instance' }));
      }
    })();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Connected to PostgreSQL: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    pool.end(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  });
});
