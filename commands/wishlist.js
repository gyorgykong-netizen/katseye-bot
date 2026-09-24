const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const cardsData = require('../data/cards');
const db = require('../data/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wishlist')
    .setDescription('Manage your photocard wishlist')
    .addSubcommand(sub => sub.setName('add').setDescription('Add a card').addStringOption(opt => opt.setName('card').setDescription('Card name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a card').addStringOption(opt => opt.setName('card').setDescription('Card name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('view').setDescription('View your wishlist')),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    const focused = interaction.options.getFocused();
    const userId = interaction.user.id;
    let results;
    if (sub === 'remove') {
      results = db.prepare(`SELECT c.* FROM cards c JOIN wishlist w ON w.card_id = c.id WHERE w.user_id = ? AND c.name LIKE ? LIMIT 25`).all(userId, `%${focused}%`);
    } else {
      results = cardsData.searchCardsByName(focused);
    }
    await interaction.respond(results.map(c => ({ name: `${c.name} (${c.era} - ${c.set_name})`, value: String(c.id) })));
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'view') {
      const items = db.prepare(`SELECT c.* FROM cards c JOIN wishlist w ON w.card_id = c.id WHERE w.user_id = ? ORDER BY c.name`).all(userId);
      const embed = new EmbedBuilder()
        .setTitle(`💌 ${interaction.user.username}'s Wishlist`)
        .setColor(0xFF2D95)
        .setDescription(items.length ? items.map(c => `${c.name} — *${c.era} / ${c.set_name}* (${c.rarity})`).join('\n') : 'Your wishlist is empty!');
      return interaction.reply({ embeds: [embed] });
    }

    const card = cardsData.getCardById(Number(interaction.options.getString('card')));
    if (!card) return interaction.reply({ content: '❌ Card not found.' });

    if (sub === 'add') {
      db.prepare(`INSERT OR IGNORE INTO wishlist (user_id, card_id) VALUES (?, ?)`).run(userId, card.id);
      return interaction.reply({ content: `💌 Added **${card.name}** to your wishlist!` });
    }
    if (sub === 'remove') {
      db.prepare(`DELETE FROM wishlist WHERE user_id = ? AND card_id = ?`).run(userId, card.id);
      return interaction.reply({ content: `🗑️ Removed **${card.name}** from your wishlist.` });
    }
  },
};