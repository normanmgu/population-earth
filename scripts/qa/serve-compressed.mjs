// Local-only production test server. Reproduces HTTP gzip delivery; not a deployment.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
const root = resolve('dist');
http.createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const bytes = await readFile(path);
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }[extname(path)] ?? 'application/octet-stream';
    const compress = /json|javascript|text/.test(type) && /gzip/.test(req.headers['accept-encoding'] ?? '');
    const body = compress ? gzipSync(bytes) : bytes;
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length, 'Cache-Control': 'no-store', 'Vary': 'Accept-Encoding', ...(compress ? { 'Content-Encoding': 'gzip' } : {}) }); res.end(body);
  } catch { res.writeHead(404).end(); }
}).listen(5175, '127.0.0.1', () => console.log('Compressed production QA: http://127.0.0.1:5175'));
