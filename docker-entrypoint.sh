#!/bin/sh

# Entrypoint script for Task Review Manager MCP Server

# Start dashboard in background if ENABLE_DASHBOARD is set
if [ "$ENABLE_DASHBOARD" = "true" ]; then
  echo "Starting dashboard on port 5111..."
  node dist/dashboard.js &
fi

# Start MCP server (stdio mode)
exec node dist/bundle.js
