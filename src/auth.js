const crypto = require('crypto');
const { BOT_TOKEN } = require('./config');
const { isAdmin } = require('./db');

function verifyTelegramInitData(initData) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculated = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (calculated !== hash) return null;

  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Date.now() / 1000 - authDate > 60 * 60 * 24) return null;

  try {
    const user = JSON.parse(params.get('user') || 'null');
    return user || null;
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.body?.initData || '';
  const user = verifyTelegramInitData(initData);
  if (!user || !isAdmin(user.id)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  req.tgUser = user;
  next();
}

module.exports = { verifyTelegramInitData, requireAdmin };
