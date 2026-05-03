const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { OWNER_ID, DATA_DIR } = require('./config');
const {
  isOwner,
  listAdmins,
  addAdmin,
  removeAdmin,
  getSettings,
  updateSettings,
  recordPost,
} = require('./db');
const { requireAdmin } = require('./auth');
const { calculatePlan } = require('./calculator');
const { parseProductText } = require('./parser');
const { buildCaption } = require('./formatter');
const { publishToChannel, cleanupFiles, notifyChannelAlive } = require('./channel');

const uploadDir = DATA_DIR
  ? path.join(path.resolve(DATA_DIR), 'uploads')
  : path.join(__dirname, '..', 'data', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Faqat rasm fayllar qabul qilinadi'));
    cb(null, true);
  },
});

function buildRouter(bot) {
  const router = express.Router();

  router.get('/me', requireAdmin, (req, res) => {
    res.json({ user: req.tgUser, isOwner: isOwner(req.tgUser.id) });
  });

  router.get('/settings', requireAdmin, (_req, res) => {
    res.json(getSettings());
  });

  router.post('/settings', requireAdmin, express.json(), (req, res) => {
    if (!isOwner(req.tgUser.id)) return res.status(403).json({ error: 'owner_only' });
    const allowed = ['initial_percent', 'markup_3', 'markup_6', 'markup_9', 'markup_12', 'min_initial', 'channel_id'];
    const patch = {};
    for (const k of allowed) {
      if (k in req.body) patch[k] = String(req.body[k]);
    }
    updateSettings(patch);
    res.json({ ok: true, settings: getSettings() });
  });

  router.get('/admins', requireAdmin, (_req, res) => {
    res.json({ admins: listAdmins(), ownerId: OWNER_ID });
  });

  router.post('/admins', requireAdmin, express.json(), (req, res) => {
    if (!isOwner(req.tgUser.id)) return res.status(403).json({ error: 'owner_only' });
    const id = Number(req.body?.telegram_id);
    if (!id) return res.status(400).json({ error: 'invalid_id' });
    addAdmin({
      telegram_id: id,
      username: req.body?.username || null,
      full_name: req.body?.full_name || null,
    });
    res.json({ ok: true, admins: listAdmins() });
  });

  router.delete('/admins/:id', requireAdmin, (req, res) => {
    if (!isOwner(req.tgUser.id)) return res.status(403).json({ error: 'owner_only' });
    const ok = removeAdmin(req.params.id);
    if (!ok) return res.status(400).json({ error: 'cannot_remove' });
    res.json({ ok: true, admins: listAdmins() });
  });

  router.post('/parse', requireAdmin, express.json(), (req, res) => {
    res.json(parseProductText(req.body?.text || ''));
  });

  router.post('/preview', requireAdmin, express.json(), (req, res) => {
    const product = req.body?.product || {};
    const settings = getSettings();
    const calc = product.price ? calculatePlan(product.price, settings) : null;
    const caption = buildCaption(product, settings);
    res.json({ caption, calc });
  });

  router.post('/check-alive', requireAdmin, async (_req, res) => {
    try {
      await notifyChannelAlive(bot);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.description || e.message });
    }
  });

  router.post('/publish', requireAdmin, upload.array('photos', 6), async (req, res) => {
    const files = (req.files || []).map((f) => f.path);
    try {
      const product = JSON.parse(req.body.product || '{}');
      if (files.length === 0) {
        return res.status(400).json({ error: 'photo_required' });
      }
      await publishToChannel(bot, product, files);
      recordPost(req.tgUser.id, { product, photoCount: files.length });
      res.json({ ok: true });
    } catch (e) {
      console.error('[publish]', e);
      res.status(500).json({ error: e.description || e.message });
    } finally {
      cleanupFiles(files);
    }
  });

  return router;
}

module.exports = { buildRouter };
