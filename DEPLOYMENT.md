# Deployment Guide

This guide covers deploying SC1DOCKER to your production Docker server.

## Prerequisites

- Docker & Docker Compose installed on your server
- SSH access to your server
- GitHub account with the repository
- (Optional) Docker Hub account for custom registry

## Step 1: Setup GitHub Container Registry (GHCR)

GitHub automatically provides a container registry for your repository.

### Enable Packages

1. Go to your repository settings
2. Navigate to "Packages and data" → "Container registry"
3. It's already enabled!

Your images will be available at: `ghcr.io/yourusername/sc1docker`

## Step 2: Set GitHub Secrets (if needed)

If using custom registry or sensitive deployments:

1. Go to Settings → Secrets and variables → Actions
2. Add any necessary secrets (e.g., SSH keys, registry credentials)

The workflow will automatically use `GITHUB_TOKEN` for GHCR.

## Step 3: Push to GitHub

```bash
git remote add origin https://github.com/yourusername/SC1DOCKER.git
git branch -M main
git push -u origin main

# Create a tag to trigger build
git tag v1.0.0
git push origin v1.0.0
```

The GitHub Actions workflow will automatically:
- Build the Docker image
- Push to GitHub Container Registry
- Create tagged versions for releases

## Step 4: Deploy to Docker Server

### Option A: Pull from GitHub Container Registry (Recommended)

```bash
# SSH into your server
ssh user@your-docker-server.com

# Create deployment directory
mkdir -p ~/sc1docker
cd ~/sc1docker

# Clone repository (use HTTPS, no SSH key needed for public repos)
git clone https://github.com/yourusername/SC1DOCKER.git .

# Login to GitHub Container Registry
echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u yourusername --password-stdin

# Pull latest image
docker pull ghcr.io/yourusername/sc1docker:main

# Or use docker-compose (update image name in docker-compose.yml)
docker-compose up -d --pull always
```

### Option B: Build on Server (Recommended)

```bash
# SSH into your server
ssh user@your-docker-server.com

# Clone repository
git clone https://github.com/yourusername/SC1DOCKER.git
cd SC1DOCKER

# Build game server image and start everything
docker-compose --profile build up -d --build

# This will:
# 1. Build sc1-game-server:latest image (Wine + SC1 files)
# 2. Start PostgreSQL container
# 3. Start game orchestrator container
# 4. Set up sc1-network for LAN play
```

## Step 5: Verify Deployment

```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs -f game-orchestrator

# Test health endpoint
curl http://localhost:3000/health

# If behind proxy, test proxy
curl http://localhost:80/health
```

## Step 6: Configure Domain with Nginx Proxy Manager

Use your existing Nginx Proxy Manager on the Docker server:

### 1. Open Nginx Proxy Manager Dashboard

Go to `http://your-server-ip:81` (or wherever you have it running)

### 2. Create New Proxy Host

- **Domain Names**: `yourdomain.com` (or your SC1 domain)
- **Scheme**: `http`
- **Forward Hostname/IP**: `localhost` or container IP
- **Forward Port**: `5121` (or wherever game orchestrator is)

### 3. Enable SSL

- Go to the SSL tab
- Select "Let's Encrypt" or upload your certificate
- Enable "Force SSL"

### 4. Test

```bash
curl https://yourdomain.com/health
```

Should return: `{"status":"ok",...}`

## Continuous Updates

### Update from GitHub

```bash
cd ~/sc1docker

# Pull latest code
git pull origin main

# Pull latest image from registry
docker pull ghcr.io/yourusername/sc1docker:main

# Restart with new image
docker-compose up -d
```

### Or with auto-pull in docker-compose.yml

The `--pull always` flag ensures fresh image:

```bash
docker-compose up -d --pull always
```

## Monitoring

### View Real-time Logs

```bash
docker-compose logs -f
```

### Check Container Status

```bash
docker-compose ps
```

### Monitor Resource Usage

```bash
docker stats
```

### Check Network Connectivity

```bash
docker network ls
docker network inspect sc1-network
```

## Troubleshooting Deployment

### Image not found

```bash
# Ensure image name matches docker-compose.yml
docker image ls | grep sc1

# Manually pull correct image
docker pull ghcr.io/yourusername/sc1docker:main
```

### Port already in use

```bash
# Find process using port 80 or 8080
sudo lsof -i :80
sudo lsof -i :8080

# Change ports in docker-compose.yml
```

### Container crashes on startup

```bash
# Check logs for errors
docker-compose logs game-orchestrator

# Rebuild without cache
docker-compose build --no-cache
docker-compose up
```

### Permission denied errors

```bash
# Ensure docker socket permissions
sudo usermod -aG docker $USER
newgrp docker

# Restart docker service
sudo systemctl restart docker
```

## Backup & Recovery

### Backup Configuration

```bash
tar -czf sc1docker-backup-$(date +%Y%m%d).tar.gz ~/sc1docker/
```

### Rollback to Previous Version

```bash
# List available tags
docker image ls | grep sc1

# Run specific version
docker-compose down
# Edit docker-compose.yml to use older tag
docker-compose up -d
```

## Performance Tuning

### Increase Max Instances

Edit `docker-compose.yml`:

```yaml
services:
  game-instance:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### Resource Limits

```bash
# Restart with resource constraints
docker-compose up -d --no-deps --scale game-instance=5
```

## Security Hardening

- [ ] Use private registry for internal images
- [ ] Enable Docker Content Trust
- [ ] Scan images for vulnerabilities
- [ ] Use secrets for sensitive data
- [ ] Implement network policies
- [ ] Regular security updates

See README.md for security considerations.
