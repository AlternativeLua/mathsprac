// Dependency-free static server for local testing.
//
//   node tools/serve.mjs [port]

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 5173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let path = normalize(decodeURIComponent(url.pathname));
  if (path.includes('..')) {
    res.writeHead(403).end('forbidden');
    return;
  }
  if (path === '/' || path.endsWith('/')) path += 'index.html';

  const file = join(ROOT, path);
  try {
    const info = await stat(file);
    if (info.isDirectory()) throw new Error('directory');
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'content-length': body.length,
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});

function announce(port) {
  const addrs = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => `http://${n.address}:${port}`);
  console.log(`serving ${ROOT}`);
  console.log(`  local:   http://localhost:${port}`);
  for (const a of addrs) console.log(`  network: ${a}   <- open this on the phone`);
}

// If the port is taken, step along to the next free one rather than dying.
let attempt = PORT;
server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE' || attempt > PORT + 10) {
    console.error(err.message);
    process.exit(1);
  }
  console.log(`port ${attempt} is in use, trying ${attempt + 1}`);
  attempt += 1;
  server.listen(attempt);
});
server.on('listening', () => announce(server.address().port));

server.listen(attempt);
