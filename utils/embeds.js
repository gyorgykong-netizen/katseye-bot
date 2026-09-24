const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { POCAS_DIR } = require('../data/cards');

const BRAND_NAME = 'EYE Cards';
const BRAND_ICON = null; // set to a URL string later if you want, e.g. your bot's avatar URL

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

  const files = [];
  const imagePath = path.join(POCAS_DIR, card.image);
  if (fs.existsSync(imagePath)) {
    // Use a clean, URL-safe filename for the attachment (spaces/special chars break Discord's URL validation)
    const ext = path.extname(card.image) || '.png';
    const safeName = `card_${card.id}${ext}`;

    files.push(new AttachmentBuilder(imagePath, { name: safeName }));
    embed.setImage(`attachment://${safeName}`);
  } else {
    embed.setDescription('⚠️ *Image file missing from /pocas folder*');
  }

  if (owned !== null) embed.addFields({ name: 'You own', value: `${owned}x`, inline: true });

  embed.setFooter({
    text: footer || BRAND_NAME,
    iconURL: BRAND_ICON || undefined,
  });

  return { embeds: [embed], files };
}

module.exports = { RARITY_COLORS, RARITY_EMOJIS, buildCardEmbed };