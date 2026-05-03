const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { OWNER_ID, DATA_DIR } = require('./config');

const dataDir = DATA_DIR ? path.resolve(DATA_DIR) : path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true });

const db = new Database(path.join(dataDir, 'shop.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    telegram_id INTEGER PRIMARY KEY,
    username TEXT,
    full_name TEXT,
    added_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sent_by INTEGER NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

const DEFAULT_SETTINGS = {
  initial_percent: '30',
  monthly_markup: '5',
  min_initial: '0',
  channel_id: '',
  address: '',
  phone1: '',
  phone2: '',
  telegram_url: '',
  instagram_url: '',
  footer_text: '',
};

const upsertSetting = db.prepare(
  `INSERT INTO settings (key, value) VALUES (?, ?)
   ON CONFLICT(key) DO NOTHING`
);
for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) upsertSetting.run(k, v);

// Migrate: remove obsolete per-period markup keys from older versions.
db.prepare(
  "DELETE FROM settings WHERE key IN ('markup_3','markup_6','markup_9','markup_12')"
).run();

const ownerExists = db.prepare('SELECT 1 FROM admins WHERE telegram_id = ?').get(OWNER_ID);
if (!ownerExists) {
  db.prepare(
    'INSERT INTO admins (telegram_id, username, full_name, added_at) VALUES (?, ?, ?, ?)'
  ).run(OWNER_ID, null, 'Owner', Date.now());
}

module.exports = {
  db,

  isAdmin(telegramId) {
    return !!db.prepare('SELECT 1 FROM admins WHERE telegram_id = ?').get(Number(telegramId));
  },

  isOwner(telegramId) {
    return Number(telegramId) === OWNER_ID;
  },

  listAdmins() {
    return db.prepare('SELECT * FROM admins ORDER BY added_at ASC').all();
  },

  addAdmin({ telegram_id, username, full_name }) {
    db.prepare(
      `INSERT OR REPLACE INTO admins (telegram_id, username, full_name, added_at)
       VALUES (?, ?, ?, COALESCE((SELECT added_at FROM admins WHERE telegram_id = ?), ?))`
    ).run(Number(telegram_id), username || null, full_name || null, Number(telegram_id), Date.now());
  },

  removeAdmin(telegramId) {
    if (Number(telegramId) === OWNER_ID) return false;
    const r = db.prepare('DELETE FROM admins WHERE telegram_id = ?').run(Number(telegramId));
    return r.changes > 0;
  },

  getSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  },

  updateSettings(obj) {
    const stmt = db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    );
    const tx = db.transaction((entries) => {
      for (const [k, v] of entries) stmt.run(k, String(v));
    });
    tx(Object.entries(obj));
  },

  recordPost(sentBy, payload) {
    db.prepare(
      'INSERT INTO posts (sent_by, payload, created_at) VALUES (?, ?, ?)'
    ).run(Number(sentBy), JSON.stringify(payload), Date.now());
  },
};
