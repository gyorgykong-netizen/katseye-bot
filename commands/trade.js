const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cardsData = require('../data/cards');
const economy = require('../utils/economy');
const trades = require('../utils/trades');
const db = require('../data/db');

const TYPE_CHOICES = [{ name: 'money', value: 'money' }, { name: 'card', value: 'card' }];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Propose a trade with another user')
    .addUserOption(opt => opt.setName('target').setDescription('User to trade with').setRequired(true))
    .addStringOption(opt => opt.setName('give').setDescription('What you give').setRequired(true).addChoices(...TYPE_CHOICES))
    .addStringOption(opt => opt.setName('get').setDescription('What you want back').setRequired(true).addChoices(...TYPE_CHOICES))
    .addIntegerOption(opt => opt.setName('give-amount').setDescription('Eyebucks to give'))
    .addStringOption(opt => opt.setName('give-card').setDescription('Card to give').setAutocomplete(true))
    .addIntegerOption(opt => opt.setName('get-amount').setDescription('Eyebucks to request'))
    .addStringOption(opt => opt.setName('get-card').setDescription('Card to request').setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    let results;
    if (focused.name === 'give-card') {
      results = db.prepare(`
        SELECT c.* FROM cards c JOIN user_cards uc ON uc.card_id = c.id
        WHERE uc.user_id = ? AND c.name LIKE ? GROUP BY c.id LIMIT 25
      `).all(interaction.user.id, `%${focused.value}%`);
    } else {
      results = cardsData.searchCardsByName(focused.value);
    }
    await interaction.respond(results.map(c => ({ name: `${c.name} (${c.era} - ${c.set_name})`, value: String(c.id) })));
  },

  async execute(interaction) {
    const initiator = interaction.user;
    const target = interaction.options.getUser('target');
    const giveType = interaction.options.getString('give');
    const getType = interaction.options.getString('get');

    if (target.bot) return interaction.reply({ content: '❌ You cannot trade with a bot.' });
    if (target.id === initiator.id) return interaction.reply({ content: '❌ You cannot trade with yourself.' });
    if (giveType === 'money' && getType === 'money') return interaction.reply({ content: '❌ You cannot trade money for money.' });

    const give = { type: giveType }, get = { type: getType };

    if (giveType === 'money') {
      const amount = interaction.options.getInteger('give-amount');
      if (!amount || amount <= 0) return interaction.reply({ content: '❌ Provide a valid give-amount.' });
      give.amount = amount;
    } else {
      const card = cardsData.getCardById(Number(interaction.options.getString('give-card')));
      if (!card) return interaction.reply({ content: '❌ Provide a valid give-card.' });
      if (economy.getOwnedCopies(initiator.id, card.id) < 1) return interaction.reply({ content: `❌ You don't own **${card.name}**.` });
      give.cardId = card.id; give.card = card;
    }

    if (getType === 'money') {
      const amount = interaction.options.getInteger('get-amount');
      if (!amount || amount <= 0) return interaction.reply({ content: '❌ Provide a valid get-amount.' });
      get.amount = amount;
    } else {
      const card = cardsData.getCardById(Number(interaction.options.getString('get-card')));
      if (!card) return interaction.reply({ content: '❌ Provide a valid get-card.' });
      get.cardId = card.id; get.card = card;
    }

    const tradeId = trades.createTrade({ fromId: initiator.id, toId: target.id, give, get });

    const giveDesc = give.type === 'money' ? `${give.amount} eyebucks 💰` : `**${give.card.name}** (${give.card.rarity})`;
    const getDesc = get.type === 'money' ? `${get.amount} eyebucks 💰` : `**${get.card.name}** (${get.card.rarity})`;

    const embed = new EmbedBuilder()
      .setTitle('🔁 Trade Proposal')
      .setColor(0xFF2D95)
      .setDescription(`${initiator} wants to trade with ${target}`)
      .addFields({ name: `${initiator.username} gives`, value: giveDesc, inline: true }, { name: `${initiator.username} gets`, value: getDesc, inline: true })
      .setFooter({ text: `Only ${target.username} can accept.` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`trade:accept:${tradeId}`).setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`trade:decline:${tradeId}`).setLabel('Decline').setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({ content: `${target}`, embeds: [embed], components: [row] });
  },
};