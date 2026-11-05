const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { OWNER_ID, UPLOAD_PATH } = require('./config');
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
const { publishToChannel, notifyChannelAlive } = require('./channel');

const MAX_PHOTOS = 6;
// Telegram re-compresses sendPhoto output to ~1920px anyway, so anything above
// ~3MB per photo is bandwidth and memory we never get back.
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

fs.mkdirSync(UPLOAD_PATH, { recursive: true });

// Only the temp file's own name on disk; the name Telegram sees is the
// uploader's original filename. Whitelisted so a client-supplied extension
// never reaches the filesystem verbatim.
const SAFE_EXT = /^\.[a-z0-9]{1,5}$/i;
function tempExtension(originalname) {
  const ext = path.extname(originalname || '');
  return SAFE_EXT.test(ext) ? ext.toLowerCase() : '.jpg';
}

// Photos are streamed to disk rather than buffered in RAM. With
// `memoryStorage`, six photos occupied up to ~120MB of Buffer memory per
// publish (the multipart encoder copies each buffer), and because Node sees a
// 24GB container it never returned that memory to the OS — resident memory sat
// at ~475MB. Disk-backed uploads are streamed to Telegram via `InputFile`,
// which uses `createReadStream`, so a photo is never fully held in memory.
// multer removes its own partial files when a request aborts or hits a limit.
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_PATH),
    filename: (_req, file, cb) => {
      const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      cb(null, name + tempExtension(file.originalname));
    },
  }),
  limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS },
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Faqat rasm fayllar qabul qilinadi'));
    cb(null, true);
  },
});

/** Best-effort removal of uploaded temp files; never throws. */
async function discardUploads(files) {
  await Promise.all(
    (files || [])
      .filter((f) => f && f.path)
      .map((f) => fs.promises.unlink(f.path).catch(() => {}))
  );
}

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
    const allowed = [
      'initial_percent',
      'monthly_markup',
      'no_initial_markup',
      'admin_fee',
      'min_initial',
      'channel_id',
      'address',
      'address_full',
      'phone1',
      'phone2',
      'phone3',
      'working_hours',
      'tagline',
      'telegram_url',
      'instagram_url',
      'footer_text',
    ];
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

  router.post('/publish', requireAdmin, upload.array('photos', MAX_PHOTOS), async (req, res) => {
    const files = req.files || [];
    try {
      const product = JSON.parse(req.body.product || '{}');
      const photos = files.map((f, i) => ({
        path: f.path,
        filename: f.originalname || `photo${i + 1}.jpg`,
      }));
      if (photos.length === 0) {
        return res.status(400).json({ error: 'photo_required' });
      }
      await publishToChannel(bot, product, photos);
      recordPost(req.tgUser.id, { product, photoCount: photos.length });
      res.json({ ok: true });
    } catch (e) {
      // Telegram API errors carry `description` and need no stack; anything
      // else is a real bug and the stack is what makes it findable.
      console.error('[publish]', e.description || e.stack || e.message);
      res.status(500).json({ error: e.description || e.message });
    } finally {
      // Uploads are scratch space: the photos now live in the channel.
      await discardUploads(files);
    }
  });

  return router;
}

module.exports = { buildRouter };
