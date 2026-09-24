const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'database.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  binder_capacity INTEGER NOT NULL DEFAULT 100,
  last_work INTEGER NOT NULL DEFAULT 0,
  last_pull INTEGER NOT NULL DEFAULT 0,
  trades_completed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  era TEXT NOT NULL,
  set_name TEXT NOT NULL,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  image TEXT NOT NULL,
  UNIQUE(era, set_name, name)
);

CREATE TABLE IF NOT EXISTS user_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  card_id INTEGER NOT NULL,
  obtained_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS wishlist (
  user_id TEXT NOT NULL,
  card_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, card_id)
);

CREATE TABLE IF NOT EXISTS set_completions (
  user_id TEXT NOT NULL,
  era TEXT NOT NULL,
  set_name TEXT NOT NULL,
  completed_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  PRIMARY KEY (user_id, era, set_name)
);
`);

try {
  db.exec('ALTER TABLE users ADD COLUMN last_pull INTEGER NOT NULL DEFAULT 0');
} catch (e) {
  // column already exists, ignore
}

module.exports = db;