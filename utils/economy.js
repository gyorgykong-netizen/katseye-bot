const db = require('../data/db');
const config = require('../config');
const cardsData = require('../data/cards');

function getUser(userId) {
  db.prepare(`INSERT OR IGNORE INTO users (user_id) VALUES (?)`).run(userId);
  return db.prepare(`SELECT * FROM users WHERE user_id = ?`).get(userId);
}
function updateBalance(userId, amount) {
  getUser(userId);
  db.prepare(`UPDATE users SET balance = balance + ? WHERE user_id = ?`).run(amount, userId);
  return getUser(userId).balance;
}
function setLastWork(userId, ts) {
  db.prepare(`UPDATE users SET last_work = ? WHERE user_id = ?`).run(ts, userId);
}
function setLastPull(userId, ts) {
  db.prepare(`UPDATE users SET last_pull = ? WHERE user_id = ?`).run(ts, userId);
}
function addBinderCapacity(userId, amount) {
  getUser(userId);
  db.prepare(`UPDATE users SET binder_capacity = binder_capacity + ? WHERE user_id = ?`).run(amount, userId);
}
function getUserCardCount(userId) {
  return db.prepare(`SELECT COUNT(*) as c FROM user_cards WHERE user_id = ?`).get(userId).c;
}
function getOwnedCopies(userId, cardId) {
  return db.prepare(`SELECT COUNT(*) as c FROM user_cards WHERE user_id = ? AND card_id = ?`).get(userId, cardId).c;
}
function giveCard(userId, cardId) {
  db.prepare(`INSERT INTO user_cards (user_id, card_id) VALUES (?, ?)`).run(userId, cardId);
}
function removeOneCopy(userId, cardId) {
  const row = db.prepare(`SELECT id FROM user_cards WHERE user_id = ? AND card_id = ? LIMIT 1`).get(userId, cardId);
  if (!row) return false;
  db.prepare(`DELETE FROM user_cards WHERE id = ?`).run(row.id);
  return true;
}
function pickRarity() {
  const weights = config.PULL_WEIGHTS;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of Object.entries(weights)) {
    if (roll < weight) return rarity;
    roll -= weight;
  }
  return 'common';
}
function pickWorkAmount() {
  const min = config.WORK_MIN, max = config.WORK_MAX;
  const weighted = [];
  let total = 0;
  for (let amount = min; amount <= max; amount++) {
    const weight = (max + 1) - amount;
    weighted.push({ amount, weight });
    total += weight;
  }
  let roll = Math.random() * total;
  for (const entry of weighted) {
    if (roll < entry.weight) return entry.amount;
    roll -= entry.weight;
  }
  return min;
}
function checkAndRewardSetCompletion(userId, era, setName) {
  const already = db.prepare(`SELECT 1 FROM set_completions WHERE user_id = ? AND era = ? AND set_name = ?`).get(userId, era, setName);
  if (already) return null;

  const allCards = cardsData.getCardsForSet(era, setName);
  if (allCards.length === 0) return null;

  const ownedCount = db.prepare(`
    SELECT COUNT(DISTINCT c.id) as c FROM cards c
    JOIN user_cards uc ON uc.card_id = c.id
    WHERE uc.user_id = ? AND c.era = ? AND c.set_name = ?
  `).get(userId, era, setName).c;

  if (ownedCount < allCards.length) return null;

  const rarity = allCards[0].rarity;
  const reward = config.SHOP_PRICES[rarity]?.specific || 0;

  db.prepare(`INSERT INTO set_completions (user_id, era, set_name) VALUES (?, ?, ?)`).run(userId, era, setName);
  updateBalance(userId, reward);

  return { reward, rarity, totalCards: allCards.length };
}
function getWishlistersForCard(cardId) {
  return db.prepare(`SELECT user_id FROM wishlist WHERE card_id = ?`).all(cardId).map(r => r.user_id);
}

module.exports = {
  getUser, updateBalance, setLastWork, setLastPull, addBinderCapacity, getUserCardCount,
  getOwnedCopies, giveCard, removeOneCopy, pickRarity, pickWorkAmount,
  checkAndRewardSetCompletion, getWishlistersForCard,
};