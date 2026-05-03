const path = require('path');
const express = require('express');
const { PORT } = require('./config');
const { bot } = require('./bot');
const { buildRouter } = require('./routes');

const app = express();

app.use(express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '1h',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache');
  },
}));

app.use('/api', buildRouter(bot));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  res.status(500).json({ error: err.message || 'server_error' });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

bot.start({
  onStart: (info) => console.log(`[bot] started as @${info.username}`),
});

const shutdown = async () => {
  console.log('[shutdown] stopping bot...');
  try {
    await bot.stop();
  } catch (_) {}
  process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
