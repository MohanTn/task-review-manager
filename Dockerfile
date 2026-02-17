# Task Review Manager MCP Server - Dockerfile
FROM node:20-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY build.js ./
COPY jest.config.js ./

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Copy entrypoint script
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Create shared database directory
RUN mkdir -p /data

# Set environment variable for database path
ENV DATABASE_PATH=/data/tasks.db

# The MCP server runs via stdio, so no exposed ports needed
# Just keep the container running
ENTRYPOINT ["/app/docker-entrypoint.sh"]
