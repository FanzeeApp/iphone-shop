const path = require('path');
require('dotenv').config();

let webAppUrl = process.env.WEB_APP_URL;
if (!webAppUrl && process.env.RAILWAY_PUBLIC_DOMAIN) {
  webAppUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
}

const required = { BOT_TOKEN: process.env.BOT_TOKEN, CHANNEL_ID: process.env.CHANNEL_ID, OWNER_ID: process.env.OWNER_ID, WEB_APP_URL: webAppUrl };
for (const [key, val] of Object.entries(required)) {
  if (!val) {
    console.error(`[config] Missing required env: ${key}. See .env.example`);
    process.exit(1);
  }
}

// Resolved once here so db.js and routes.js cannot drift apart on where data
// lives. On Railway DATA_DIR is /app/data and must be a mounted volume,
// otherwise the SQLite file is lost on every deploy (see README, Qadam 4).
const dataPath = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  CHANNEL_ID: process.env.CHANNEL_ID,
  WEB_APP_URL: webAppUrl.replace(/\/$/, ''),
  OWNER_ID: Number(process.env.OWNER_ID),
  PORT: Number(process.env.PORT || 3000),
  DATA_PATH: dataPath,
  UPLOAD_PATH: path.join(dataPath, 'uploads'),

  MAX_PHOTOS: 6,
  // Telegram re-compresses sendPhoto output to ~1920px, so bytes beyond this
  // are discarded server-side after costing upload bandwidth and memory.
  // Shared so the upload limit and the error message shown cannot disagree.
  MAX_PHOTO_MB: 3,
};
