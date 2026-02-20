#!/bin/sh

# Entrypoint script for AIConductor MCP Server
# Note: the MCP server (bundle.js) starts the dashboard internally on port 5111

# Start MCP server (stdio mode)
exec node dist/bundle.js
