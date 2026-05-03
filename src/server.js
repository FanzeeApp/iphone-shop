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

(async () => {
  // Drop any leftover webhook from a prior config (webhooks conflict with polling)
  // and discard pending updates queued during downtime.
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
    console.log('[bot] webhook cleared, pending updates dropped');
  } catch (e) {
    console.warn('[bot] deleteWebhook warning:', e.description || e.message);
  }

  // Start polling. If another instance grabbed updates first, wait & retry —
  // the previous instance's long-poll will release within ~30s.
  let attempt = 0;
  while (true) {
    try {
      await bot.start({
        drop_pending_updates: true,
        onStart: (info) => console.log(`[bot] started as @${info.username}`),
      });
      break;
    } catch (e) {
      const desc = e.description || e.message || '';
      const conflict = e.error_code === 409 || /conflict/i.test(desc);
      if (!conflict) throw e;
      attempt++;
      const delay = Math.min(60_000, 5_000 * attempt);
      console.warn(`[bot] 409 conflict (attempt ${attempt}). Another instance is polling — retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
})().catch((err) => {
  console.error('[bot] fatal:', err);
  process.exit(1);
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
