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

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  CHANNEL_ID: process.env.CHANNEL_ID,
  WEB_APP_URL: webAppUrl.replace(/\/$/, ''),
  OWNER_ID: Number(process.env.OWNER_ID),
  PORT: Number(process.env.PORT || 3000),
  DATA_DIR: process.env.DATA_DIR || null,
};
