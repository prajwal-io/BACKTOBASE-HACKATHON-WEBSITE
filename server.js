// Zero-dependency local dev server for the B2B Hacks site.
// Usage: node server.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.argv[2] || process.env.PORT || 4173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed', { 'Content-Type': 'text/plain' });
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  } catch {
    return send(res, 400, 'Bad Request', { 'Content-Type': 'text/plain' });
  }

  // Clean URLs: /application -> /application.html
  const candidates = [];
  if (pathname.endsWith('/')) candidates.push(path.join(root, pathname, 'index.html'));
  else {
    candidates.push(path.join(root, pathname));
    candidates.push(path.join(root, pathname + '.html'));
    candidates.push(path.join(root, pathname, 'index.html'));
  }

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    // Never serve outside the project root.
    if (!resolved.startsWith(path.resolve(root) + path.sep) && resolved !== path.resolve(root)) continue;
    let stat;
    try {
      stat = fs.statSync(resolved);
    } catch {
      continue;
    }
    if (stat.isDirectory()) continue;
    const ext = path.extname(resolved).toLowerCase();
    const type = types[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(resolved).pipe(res);
  }

  send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
});

server.listen(port, () => {
  console.log(`B2B Hacks dev server → http://localhost:${port}`);
});
