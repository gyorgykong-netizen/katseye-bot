const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../data/db');
const economy = require('../utils/economy');
const browser = require('../utils/browser');

module.exports = {
  data: new SlashCommandBuilder().setName('binder').setDescription('View your photocard binder'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId);
    const cardCount = economy.getUserCardCount(userId);

    const rarityBreakdown = db.prepare(`
      SELECT c.rarity, COUNT(*) as count FROM user_cards uc
      JOIN cards c ON c.id = uc.card_id
      WHERE uc.user_id = ? GROUP BY c.rarity
    `).all(userId);

    const setsCompleted = db.prepare(`SELECT COUNT(*) as c FROM set_completions WHERE user_id = ?`).get(userId).c;

    const embed = new EmbedBuilder()
      .setTitle(`📕 ${interaction.user.username}'s Binder`)
      .setColor(0xFF2D95)
      .addFields(
        { name: '💰 Balance', value: `${user.balance} eyebucks`, inline: true },
        { name: '📦 Capacity', value: `${cardCount}/${user.binder_capacity}`, inline: true },
        { name: '✅ Sets Completed', value: `${setsCompleted}`, inline: true },
        { name: 'Rarity Breakdown', value: rarityBreakdown.length ? rarityBreakdown.map(r => `${r.rarity}: **${r.count}**`).join('\n') : 'No cards yet — try `/pull`!' },
      );

    const row = browser.buildEraSelect('binder');
    await interaction.reply({ embeds: [embed], components: [row] });
  },
};