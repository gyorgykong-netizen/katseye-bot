const { SlashCommandBuilder } = require('discord.js');
const cardsData = require('../data/cards');
const economy = require('../utils/economy');
const config = require('../config');
const db = require('../data/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Sell a photocard from your binder')
    .addStringOption(opt => opt.setName('card').setDescription('Card to sell').setRequired(true).setAutocomplete(true))
    .addIntegerOption(opt => opt.setName('quantity').setDescription('How many to sell').setMinValue(1)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const results = db.prepare(`
      SELECT c.*, COUNT(uc.id) as copies FROM cards c
      JOIN user_cards uc ON uc.card_id = c.id
      WHERE uc.user_id = ? AND c.name LIKE ?
      GROUP BY c.id ORDER BY c.name LIMIT 25
    `).all(interaction.user.id, `%${focused}%`);
    await interaction.respond(results.map(c => ({ name: `${c.name} (${c.era} - x${c.copies})`, value: String(c.id) })));
  },

  async execute(interaction) {
    const userId = interaction.user.id;
    const card = cardsData.getCardById(Number(interaction.options.getString('card')));
    const quantity = interaction.options.getInteger('quantity') || 1;
    if (!card) return interaction.reply({ content: '❌ Card not found.' });

    const owned = economy.getOwnedCopies(userId, card.id);
    if (owned < quantity) return interaction.reply({ content: `❌ You only own ${owned}x **${card.name}**.` });

    const unitPrice = config.SELL_PRICES[card.rarity];
    for (let i = 0; i < quantity; i++) economy.removeOneCopy(userId, card.id);
    const total = unitPrice * quantity;
    economy.updateBalance(userId, total);

    await interaction.reply(`💸 Sold **${quantity}x ${card.name}** for **${total} eyebucks**!`);
  },
};