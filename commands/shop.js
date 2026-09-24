const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const cardsData = require('../data/cards');
const economy = require('../utils/economy');
const config = require('../config');
const { buildCardEmbed } = require('../utils/embeds');

const RARITY_CHOICES = cardsData.VALID_RARITIES.map(r => ({ name: r, value: r }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Buy photocards and binders with eyebucks')
    .addSubcommand(sub => sub.setName('prices').setDescription('View the shop price list'))
    .addSubcommand(sub => sub.setName('buy-specific').setDescription('Buy a specific card')
      .addStringOption(opt => opt.setName('rarity').setDescription('Rarity').setRequired(true).addChoices(...RARITY_CHOICES))
      .addStringOption(opt => opt.setName('card').setDescription('Card name').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('buy-random').setDescription('Buy a random card of a rarity')
      .addStringOption(opt => opt.setName('rarity').setDescription('Rarity').setRequired(true).addChoices(...RARITY_CHOICES)))
    .addSubcommand(sub => sub.setName('buy-binder').setDescription('Buy a bigger binder')
      .addIntegerOption(opt => opt.setName('size').setDescription('Binder size').setRequired(true)
        .addChoices({ name: '100 slots - 1500', value: 100 }, { name: '250 slots - 2500', value: 250 }, { name: '500 slots - 4000', value: 500 }))),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const rarity = interaction.options.getString('rarity');
    const results = cardsData.searchCardsByName(focused, { rarity });
    await interaction.respond(results.map(c => ({ name: `${c.name} (${c.era} - ${c.set_name})`, value: String(c.id) })));
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    economy.getUser(userId);

    if (sub === 'prices') {
      const embed = new EmbedBuilder()
        .setTitle('🛍️ Eyekon Shop')
        .setColor(0xFF2D95)
        .setDescription(
          Object.entries(config.SHOP_PRICES).map(([r, p]) => `**${r[0].toUpperCase() + r.slice(1)}** — Specific: ${p.specific} 💰 | Random: ${p.random} 💰`).join('\n') +
          `\n\n**Binders**\n100 slots — ${config.BINDER_PRICES[100]} 💰\n250 slots — ${config.BINDER_PRICES[250]} 💰\n500 slots — ${config.BINDER_PRICES[500]} 💰`
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'buy-specific') {
      const rarity = interaction.options.getString('rarity');
      const card = cardsData.getCardById(Number(interaction.options.getString('card')));
      if (!card || card.rarity !== rarity) return interaction.reply({ content: '❌ That card doesn\'t match the chosen rarity.' });

      const price = config.SHOP_PRICES[rarity].specific;
      const user = economy.getUser(userId);
      if (user.balance < price) return interaction.reply({ content: `❌ You need ${price} but have ${user.balance}.` });
      if (economy.getUserCardCount(userId) >= user.binder_capacity) return interaction.reply({ content: '📕 Your binder is full!' });

      economy.updateBalance(userId, -price);
      const ownedBefore = economy.getOwnedCopies(userId, card.id);
      economy.giveCard(userId, card.id);
      const completion = economy.checkAndRewardSetCompletion(userId, card.era, card.set_name);

      const { embeds, files } = buildCardEmbed(card, { owned: ownedBefore + 1 });
      let content = `✅ Bought **${card.name}** for ${price} eyebucks!`;
      if (completion) content += `\n🎉 SET COMPLETE! Earned **${completion.reward}** eyebucks!`;
      return interaction.reply({ content, embeds, files });
    }

    if (sub === 'buy-random') {
      const rarity = interaction.options.getString('rarity');
      const price = config.SHOP_PRICES[rarity].random;
      const user = economy.getUser(userId);
      if (user.balance < price) return interaction.reply({ content: `❌ You need ${price} but have ${user.balance}.` });
      if (economy.getUserCardCount(userId) >= user.binder_capacity) return interaction.reply({ content: '📕 Your binder is full!' });

      const card = cardsData.getRandomCardByRarity(rarity);
      if (!card) return interaction.reply({ content: `😢 No ${rarity} cards exist yet.` });

      economy.updateBalance(userId, -price);
      const ownedBefore = economy.getOwnedCopies(userId, card.id);
      economy.giveCard(userId, card.id);
      const completion = economy.checkAndRewardSetCompletion(userId, card.era, card.set_name);

      const { embeds, files } = buildCardEmbed(card, { owned: ownedBefore + 1 });
      let content = `✅ Bought a random ${rarity} card for ${price} eyebucks!`;
      if (completion) content += `\n🎉 SET COMPLETE! Earned **${completion.reward}** eyebucks!`;
      return interaction.reply({ content, embeds, files });
    }

    if (sub === 'buy-binder') {
      const size = interaction.options.getInteger('size');
      const price = config.BINDER_PRICES[size];
      const user = economy.getUser(userId);
      if (user.balance < price) return interaction.reply({ content: `❌ You need ${price} but have ${user.balance}.` });

      economy.updateBalance(userId, -price);
      economy.addBinderCapacity(userId, size);
      const updated = economy.getUser(userId);
      return interaction.reply({ content: `📕 Bought a ${size}-slot binder! New capacity: **${updated.binder_capacity}**` });
    }
  },
};