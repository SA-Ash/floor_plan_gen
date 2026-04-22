const http = require('http');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { initWebSocket } = require('./ws');

// ── Routes ───────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────
// Disable ETags and caching to ensure clean 200 status codes instead of 304s
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// ── Mount routes ─────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ── Start server ─────────────────────────────────────────────────────────
const server = http.createServer(app);
initWebSocket(server);

server.listen(config.PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║     Build My Home — Backend Server       ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log(`  ║  HTTP  : http://localhost:${config.PORT}          ║`);
  console.log(`  ║  WS    : ws://localhost:${config.PORT}/ws          ║`);
  console.log(`  ║  API   : /api/*                         ║`);
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
