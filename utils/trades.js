const pending = new Map();
let counter = 0;

function createTrade(data) {
  const id = String(++counter) + Date.now().toString(36);
  pending.set(id, data);
  return id;
}
function getTrade(id) { return pending.get(id); }
function deleteTrade(id) { pending.delete(id); }

module.exports = { createTrade, getTrade, deleteTrade };