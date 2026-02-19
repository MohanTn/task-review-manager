import esbuild from 'esbuild';
import fs from 'fs-extra';

// Bundle the MCP server for distribution
await esbuild.build({
  entryPoints: ['dist/index.js'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/bundle.js',
  format: 'esm',
  external: [
    '@modelcontextprotocol/sdk',
    'fs',
    'fs/promises',
    'path',
    'url',
    'fs-extra',
    'express',
    'better-sqlite3'
  ],
  banner: {
    js: '#!/usr/bin/env node\n'
  }
});

// Make the bundle executable
await fs.chmod('dist/bundle.js', 0o755);

// Copy public directory for dashboard
await fs.copy('src/public', 'dist/public', { overwrite: true });

console.log('✓ Build complete');
