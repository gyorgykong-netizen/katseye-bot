const fs = require('fs');
const path = require('path');
const db = require('./db');

const POCAS_DIR = path.join(__dirname, '..', 'pocas');
const FILE_PATH = path.join(POCAS_DIR, 'photocards.txt');

const VALID_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'divine'];
const VALID_ERAS = ['SIS', 'Beautiful Chaos', 'WILD', 'No Era'];

function loadCardsFromFile() {
  if (!fs.existsSync(FILE_PATH)) {
    fs.mkdirSync(POCAS_DIR, { recursive: true });
    fs.writeFileSync(FILE_PATH, `# Era|Set|Rarity|Name|ImageFile\n`);
    console.warn(`[cards] Created empty ${FILE_PATH}. Add your cards!`);
    return [];
  }

  const lines = fs.readFileSync(FILE_PATH, 'utf8').split(/\r?\n/);
  const cards = [];

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    const parts = line.split('|').map(p => p.trim());
    if (parts.length !== 5) {
      console.warn(`[cards] Line ${index + 1} malformed, skipping: "${rawLine}"`);
      return;
    }

    const [eraRaw, setName, rarityRaw, name, image] = parts;
    const rarity = rarityRaw.toLowerCase();
    const era = VALID_ERAS.find(e => e.toLowerCase() === eraRaw.toLowerCase());

    if (!era) {
      console.warn(`[cards] Line ${index + 1}: invalid era "${eraRaw}", skipping.`);
      return;
    }
    if (!VALID_RARITIES.includes(rarity)) {
      console.warn(`[cards] Line ${index + 1}: invalid rarity "${rarityRaw}", skipping.`);
      return;
    }

    if (!fs.existsSync(path.join(POCAS_DIR, image))) {
      console.warn(`[cards] Line ${index + 1}: image "${image}" not found in /pocas (card will still load).`);
    }

    cards.push({ era, setName, rarity, name, image });
  });

  return cards;
}

function syncCardsToDatabase() {
  const cards = loadCardsFromFile();

  const upsert = db.prepare(`
    INSERT INTO cards (era, set_name, name, rarity, image)
    VALUES (@era, @setName, @name, @rarity, @image)
    ON CONFLICT(era, set_name, name)
    DO UPDATE SET rarity = excluded.rarity, image = excluded.image
  `);

  const insertMany = db.transaction(rows => {
    for (const row of rows) upsert.run(row);
  });

  insertMany(cards);
  console.log(`[cards] Synced ${cards.length} cards from photocards.txt`);
  return cards.length;
}

function getAllCards() {
  return db.prepare(`SELECT * FROM cards`).all();
}
function getCardById(id) {
  return db.prepare(`SELECT * FROM cards WHERE id = ?`).get(id);
}
function getRandomCardByRarity(rarity) {
  return db.prepare(`SELECT * FROM cards WHERE rarity = ? ORDER BY RANDOM() LIMIT 1`).get(rarity);
}
function getErasWithCards() {
  return VALID_ERAS.filter(era => db.prepare(`SELECT 1 FROM cards WHERE era = ? LIMIT 1`).get(era));
}
function getSetsForEra(era) {
  return db.prepare(`SELECT DISTINCT set_name FROM cards WHERE era = ? ORDER BY set_name`).all(era).map(r => r.set_name);
}
function getCardsForSet(era, setName) {
  return db.prepare(`SELECT * FROM cards WHERE era = ? AND set_name = ? ORDER BY name`).all(era, setName);
}
function getSetsOwnedByUser(userId, era) {
  return db.prepare(`
    SELECT DISTINCT c.set_name FROM cards c
    JOIN user_cards uc ON uc.card_id = c.id
    WHERE uc.user_id = ? AND c.era = ?
    ORDER BY c.set_name
  `).all(userId, era).map(r => r.set_name);
}
function getOwnedCardsForSet(userId, era, setName) {
  return db.prepare(`
    SELECT c.*, COUNT(uc.id) as copies
    FROM cards c
    JOIN user_cards uc ON uc.card_id = c.id
    WHERE uc.user_id = ? AND c.era = ? AND c.set_name = ?
    GROUP BY c.id ORDER BY c.name
  `).all(userId, era, setName);
}

function searchCardsByName(query, { rarity = null, limit = 25 } = {}) {
  const trimmed = (query || '').trim();
  const words = trimmed.split(/\s+/).filter(Boolean);

  let sql = `SELECT * FROM cards WHERE 1=1`;
  const params = [];

  // Require each typed word to match somewhere in name, era, or set name.
  // This prevents a stray space from breaking the search, and lets users
  // search across multiple fields (e.g. "Lara Beautiful" finds Lara's
  // Beautiful Chaos cards).
  for (const word of words) {
    sql += ` AND (name LIKE ? OR era LIKE ? OR set_name LIKE ?)`;
    const like = `%${word}%`;
    params.push(like, like, like);
  }

  if (rarity) {
    sql += ` AND rarity = ?`;
    params.push(rarity);
  }

  sql += ` ORDER BY name LIMIT ?`;
  params.push(limit);

  return db.prepare(sql).all(...params);
}

module.exports = {
  VALID_RARITIES, VALID_ERAS, POCAS_DIR,
  syncCardsToDatabase, getAllCards, getCardById, getRandomCardByRarity,
  getErasWithCards, getSetsForEra, getCardsForSet, getSetsOwnedByUser,
  getOwnedCardsForSet, searchCardsByName,
};