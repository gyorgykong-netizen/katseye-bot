const { EmbedBuilder } = require('discord.js');

const BRAND_NAME = 'EYE Cards';
const BRAND_ICON = null; // set to a URL string later if you want, e.g. your bot's avatar URL

// GitHub raw base URL — images are hosted here instead of locally, keeping the bot's
// deployment package tiny (a few KB instead of 450MB+) so it fits on free hosts like Pella.
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/gyorgykong-netizen/katseye-bot/master/pocas/';

const RARITY_COLORS = {
  common: 0xB0B0B0, uncommon: 0x4CAF50, rare: 0x2196F3,
  epic: 0x9C27B0, legendary: 0xFF9800, divine: 0xFF2D95,
};
const RARITY_EMOJIS = {
  common: '⚪', uncommon: '🟢', rare: '🔵', epic: '🟣', legendary: '🟠', divine: '✨',
};

function buildCardEmbed(card, { owned = null, footer = null } = {}) {
  const embed = new EmbedBuilder()
    .setTitle(`${RARITY_EMOJIS[card.rarity] || ''} ${card.name}`)
    .setColor(RARITY_COLORS[card.rarity] || 0xFFFFFF)
    .addFields(
      { name: 'Era', value: card.era, inline: true },
      { name: 'Set', value: card.set_name, inline: true },
      { name: 'Rarity', value: card.rarity[0].toUpperCase() + card.rarity.slice(1), inline: true },
    );

  // Build the image URL from GitHub instead of reading a local file.
  // encodeURIComponent handles spaces and special characters in filenames
  // (e.g. "Daniela - Beautiful Chaos Weverse Fansign.jpg" -> URL-safe).
  const safeFilename = encodeURIComponent(card.image);
  const imageUrl = GITHUB_BASE_URL + safeFilename;

  embed.setImage(imageUrl);

  if (owned !== null) embed.addFields({ name: 'You own', value: `${owned}x`, inline: true });

  embed.setFooter({
    text: footer || BRAND_NAME,
    iconURL: BRAND_ICON || undefined,
  });

  return { embeds: [embed], files: [] };
}

module.exports = { RARITY_COLORS, RARITY_EMOJIS, buildCardEmbed };
