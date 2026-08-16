# StarCraft 1 HTML5 Docker Container

A containerized StarCraft 1 game server with all DLCs running in HTML5, supporting multiple concurrent players on localhost.

## Architecture

```
Frontend (Web UI)
    ↓
Orchestrator API (Node.js - Port 5121)
    ↓
PostgreSQL Database
    ↓
Game Instances (Docker containers - Dynamic ports)

(SSL/Reverse Proxy handled by Nginx Proxy Manager on Docker server)
```

## Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ (for local development)
- Git

## Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url> SC1DOCKER
cd SC1DOCKER
```

### 2. Build All Images & Start Services

```bash
# Build game server image and start all containers
docker-compose --profile build up -d --build

# Or manually:
docker-compose --profile build build  # Build game server image
docker-compose up -d                  # Start orchestrator + database
```

The `--profile build` flag ensures the game-server image is built. This happens once and then game instances are spawned dynamically from this image.

### 4. Access the Server

- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:5121
- **Health Check**: http://localhost:5121/health
- **Database**: postgres:5432 (internal, not exposed)

## Project Structure

```
SC1DOCKER/
├── Dockerfile              # Container image definition
├── docker-compose.yml      # Multi-container orchestration
├── server.js              # Main Node.js server
├── package.json           # Dependencies
├── nginx.conf             # Reverse proxy config (create as needed)
├── config/                # Configuration files
├── frontend/              # Web UI source code
├── docker/                # Docker-related files
│   └── game-server/       # Game server assets
└── ssl/                   # SSL certificates (for HTTPS)
```

## API Endpoints

### Health Check
- **GET** `/health` - Server health status

### Game Instance Management
- **POST** `/api/instance/create` - Spin up a new game instance
- **GET** `/api/instance/:id` - Get instance info
- **DELETE** `/api/instance/:id` - Terminate instance

## Configuration

Environment variables (set in `.env` or `docker-compose.yml`):

```env
NODE_ENV=production
PORT=3000
DOCKER_HOST=unix:///var/run/docker.sock
```

## Development

### Local Development

```bash
npm install
npm start
```

### Docker Development

```bash
# Build image with development tag
docker build -t sc1-game-server:dev .

# Run with volume mount for live editing
docker run -v $(pwd):/app -p 3000:3000 sc1-game-server:dev
```

## GitHub Integration

### Push to GitHub

1. Create a new repository on GitHub
2. Add remote and push:

```bash
git remote add origin https://github.com/yourusername/SC1DOCKER.git
git branch -M main
git push -u origin main
```

### Docker Hub Integration (Optional)

To automatically build and push Docker images to Docker Hub:

1. Connect GitHub repo to Docker Hub
2. Set up automated builds
3. Images will push on every commit

## Deployment to Server

### Pull and Run on Docker Server

```bash
# SSH into your Docker server
ssh user@docker-server.com

# Clone the repo
git clone https://github.com/yourusername/SC1DOCKER.git
cd SC1DOCKER

# Build and run
docker-compose up -d --build

# View logs
docker-compose logs -f
```

## Testing

### Test Locally

```bash
# Start containers
docker-compose up

# In another terminal, test endpoints
curl http://localhost:3000/health
curl -X POST http://localhost:8080/api/instance/create
```

### Scaling

To run multiple game instances:

```bash
# Docker Compose automatically handles scaling
docker-compose up -d --scale game-instance=3
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs game-orchestrator

# Rebuild image
docker-compose build --no-cache
```

### Port conflicts

Change ports in `docker-compose.yml`:

```yaml
ports:
  - "8080:8080"  # Change left number to different port
```

### Health check failing

```bash
# Test health endpoint directly
docker exec sc1-orchestrator curl http://localhost:3000/health
```

## Security Considerations

- [ ] Configure SSL/TLS in Nginx Proxy Manager
- [ ] Set strong JWT_SECRET environment variable
- [ ] Use Docker secrets for sensitive data (DB passwords, JWT_SECRET)
- [ ] Set resource limits for containers
- [ ] Implement rate limiting on API endpoints
- [ ] Use private Docker registry if needed
- [ ] Restrict database access (only game-orchestrator should connect)

## Next Steps

1. **Add Game Assets**: Place StarCraft 1 HTML5 files in `docker/game-server/`
2. **Implement Frontend**: Build web UI in `frontend/` folder
3. **Add Authentication**: Implement player authentication
4. **Database**: Add persistent storage for game state
5. **Load Balancing**: Configure nginx for multiple instances

## License

MIT

## Support

For issues and questions, use GitHub Issues.
