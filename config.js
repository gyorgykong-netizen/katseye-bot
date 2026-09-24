module.exports = {
  PULL_WEIGHTS: {
    uncommon: 30,
    common: 25,
    rare: 22,
    epic: 15,
    legendary: 6,
    divine: 2,
  },

  SHOP_PRICES: {
    common: { specific: 1000, random: 250 },
    uncommon: { specific: 1750, random: 450 },
    rare: { specific: 2500, random: 650 },
    epic: { specific: 3500, random: 1250 },
    legendary: { specific: 6000, random: 3000 },
    divine: { specific: 8000, random: 4000 },
  },

  SELL_PRICES: {
    common: 50,
    uncommon: 90,
    rare: 130,
    epic: 250,
    legendary: 600,
    divine: 800,
  },

  BINDER_PRICES: { 100: 1500, 250: 2500, 500: 4000 },

  DEFAULT_BINDER_CAPACITY: 100,

  WORK_MIN: 50,
  WORK_MAX: 100,
  WORK_COOLDOWN_MS: 15 * 60 * 1000, // 15 min, change freely
  PULL_COOLDOWN_MS: 5 * 60 * 1000, // 5 min
};