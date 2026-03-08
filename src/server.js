/**
 * server.js — GG Schedule
 * Servidor HTTP principal. Zero dependências npm.
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const db     = require('./db/database');
const api    = require('./routes/api');
const sched  = require('./services/scheduler');

const PORT    = process.env.PORT || 3000;
const PUBLIC  = path.join(__dirname, 'public');

// ── MIME types ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
};

function serveFile(res, filePath) {
  try {
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not Found');
  }
}

// ── Server ────────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const rawUrl   = req.url.split('?')[0];
  const method   = req.method;

  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // API
  if (rawUrl.startsWith('/api/')) return api.handle(req, res);

  // Static
  if (rawUrl === '/' || rawUrl === '/index.html') return serveFile(res, path.join(PUBLIC, 'index.html'));

  const filePath = path.join(PUBLIC, rawUrl);
  // Security: stay within public dir
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return serveFile(res, filePath);

  // SPA fallback
  serveFile(res, path.join(PUBLIC, 'index.html'));
});

// ── Boot ──────────────────────────────────────────────────────────────────────
console.log('🎮 GG Schedule — iniciando...');
db.init();
console.log('✅ Banco de dados pronto (SQLite)');
sched.start();

server.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}\n`);
  console.log('  📂 Banco: db/scheduler.db');
  console.log('  🔔 Notificações: configure webhook Discord em Configurações\n');
});
