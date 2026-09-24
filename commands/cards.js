const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const browser = require('../utils/browser');

module.exports = {
  data: new SlashCommandBuilder().setName('cards').setDescription('Browse the full photocard catalog'),

  async execute(interaction) {
    const embed = new EmbedBuilder().setTitle('🗂️ Photocard Catalog').setDescription('Pick an era to start browsing!').setColor(0xFF2D95);
    const row = browser.buildEraSelect('catalog');
    await interaction.reply({ embeds: [embed], components: [row] });
  },
};