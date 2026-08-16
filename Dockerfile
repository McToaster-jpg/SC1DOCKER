# Multi-stage build for StarCraft 1 HTML5 game server
FROM node:18-alpine AS builder

WORKDIR /app

# Copy game assets and configuration
COPY . .

# Install dependencies
RUN npm install --production

# Final stage
FROM node:18-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    tini \
    curl

# Copy from builder
COPY --from=builder /app /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port for game server
EXPOSE 5121

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5121/health || exit 1

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
