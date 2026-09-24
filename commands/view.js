const { SlashCommandBuilder } = require('discord.js');
const cardsData = require('../data/cards');
const economy = require('../utils/economy');
const { buildCardEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('view')
    .setDescription('View a specific photocard')
    .addStringOption(opt => opt.setName('card').setDescription('Card name').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const results = cardsData.searchCardsByName(focused);
    await interaction.respond(results.map(c => ({ name: `${c.name} (${c.era} - ${c.set_name})`, value: String(c.id) })));
  },

  async execute(interaction) {
    const cardId = Number(interaction.options.getString('card'));
    const card = cardsData.getCardById(cardId);
    if (!card) return interaction.reply({ content: '❌ Card not found.' });

    const owned = economy.getOwnedCopies(interaction.user.id, card.id);
    const { embeds, files } = buildCardEmbed(card, { owned });
    await interaction.reply({ embeds, files });
  },
};