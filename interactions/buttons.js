const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const cardsData = require('../data/cards');
const economy = require('../utils/economy');
const config = require('../config');
const { buildCardEmbed } = require('../utils/embeds');
const browser = require('../utils/browser');
const trades = require('../utils/trades');
const db = require('../data/db');

async function handleButton(interaction) {
  const [prefix, ...rest] = interaction.customId.split(':');
  if (prefix === 'view') return handleView(interaction, rest);
  if (prefix === 'back') return handleBack(interaction, rest);
  if (prefix === 'sell') return handleSellButton(interaction, rest);
  if (prefix === 'trade') return handleTradeButton(interaction, rest);
  if (prefix === 'setpage') return handleSetPage(interaction, rest);
  if (prefix === 'cardpage') return handleCardPage(interaction, rest);
}

async function handleView(interaction, [scope, cardIdStr, eraEnc, setEnc]) {
  const card = cardsData.getCardById(Number(cardIdStr));
  if (!card) return interaction.reply({ content: '❌ Card not found.' });

  const owned = economy.getOwnedCopies(interaction.user.id, card.id);
  const { embeds, files } = buildCardEmbed(card, { owned });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`back:${scope}:${eraEnc}:${setEnc}`).setLabel('⬅ Back').setStyle(ButtonStyle.Secondary)
  );
  if (owned > 0) {
    row.addComponents(new ButtonBuilder().setCustomId(`sell:${card.id}`).setLabel(`Sell (${config.SELL_PRICES[card.rarity]} 💰)`).setStyle(ButtonStyle.Danger));
  }

  await interaction.update({ embeds, files, components: [row] });
}

async function handleBack(interaction, [scope, eraEnc, setEnc]) {
  const era = browser.decode(eraEnc);
  const setName = browser.decode(setEnc);
  const { rows, cards, totalPages, currentPage } = browser.buildCardButtons(scope, era, setName, interaction.user.id, 0);

  if (cards.length === 0) {
    return interaction.update({ content: 'No cards found here anymore.', embeds: [], files: [], components: [] });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${era} — ${setName}`)
    .setColor(0xFF2D95)
    .setDescription(`Click a card to view it!${totalPages > 1 ? ` (Page ${currentPage + 1}/${totalPages})` : ''}`);
  await interaction.update({ content: null, embeds: [embed], files: [], components: rows });
}

async function handleSellButton(interaction, [cardIdStr]) {
  const card = cardsData.getCardById(Number(cardIdStr));
  if (!card) return interaction.reply({ content: '❌ Card not found.' });

  const owned = economy.getOwnedCopies(interaction.user.id, card.id);
  if (owned < 1) return interaction.reply({ content: '❌ You no longer own this card.' });

  economy.removeOneCopy(interaction.user.id, card.id);
  const price = config.SELL_PRICES[card.rarity];
  economy.updateBalance(interaction.user.id, price);

  await interaction.reply({ content: `💸 Sold **${card.name}** for **${price} eyebucks**!` });
}

async function handleSetPage(interaction, [scope, eraEnc, pageStr]) {
  const era = browser.decode(eraEnc);
  const page = Number(pageStr);
  const result = browser.buildSetSelect(scope, era, interaction.user.id, page);

  if (!result) {
    return interaction.update({ content: `No sets found for **${era}**.`, embeds: [], components: [] });
  }

  const embed = new EmbedBuilder().setTitle(era).setDescription(`Now pick a set! (Page ${result.currentPage + 1}/${result.totalPages})`).setColor(0xFF2D95);
  return interaction.update({ content: null, embeds: [embed], components: result.rows });
}

async function handleCardPage(interaction, [scope, eraEnc, setEnc, pageStr]) {
  const era = browser.decode(eraEnc);
  const setName = browser.decode(setEnc);
  const page = Number(pageStr);
  const { rows, cards, totalPages, currentPage } = browser.buildCardButtons(scope, era, setName, interaction.user.id, page);

  if (cards.length === 0) {
    return interaction.update({ content: `No cards found in **${era} - ${setName}**.`, embeds: [], components: [] });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${era} — ${setName}`)
    .setDescription(`Click a card to view it!${totalPages > 1 ? ` (Page ${currentPage + 1}/${totalPages})` : ''}`)
    .setColor(0xFF2D95);
  return interaction.update({ content: null, embeds: [embed], components: rows });
}

async function handleTradeButton(interaction, [action, tradeId]) {
  const trade = trades.getTrade(tradeId);
  if (!trade) return interaction.update({ content: '❌ This trade is no longer valid.', embeds: [], components: [] });

  if (action === 'decline') {
    if (![trade.fromId, trade.toId].includes(interaction.user.id)) return interaction.reply({ content: '❌ Not your trade.' });
    trades.deleteTrade(tradeId);
    return interaction.update({ content: '❌ Trade declined.', embeds: [], components: [] });
  }

  if (action === 'accept') {
    if (interaction.user.id !== trade.toId) return interaction.reply({ content: '❌ Only the recipient can accept this.' });

    const { fromId, toId, give, get } = trade;

    if (give.type === 'money' && economy.getUser(fromId).balance < give.amount) { trades.deleteTrade(tradeId); return interaction.update({ content: '❌ Trade failed: initiator lacks funds.', embeds: [], components: [] }); }
    if (give.type === 'card' && economy.getOwnedCopies(fromId, give.cardId) < 1) { trades.deleteTrade(tradeId); return interaction.update({ content: '❌ Trade failed: initiator no longer has that card.', embeds: [], components: [] }); }
    if (get.type === 'money' && economy.getUser(toId).balance < get.amount) { trades.deleteTrade(tradeId); return interaction.update({ content: '❌ Trade failed: you lack funds.', embeds: [], components: [] }); }
    if (get.type === 'card' && economy.getOwnedCopies(toId, get.cardId) < 1) { trades.deleteTrade(tradeId); return interaction.update({ content: '❌ Trade failed: you no longer have that card.', embeds: [], components: [] }); }

    if (give.type === 'card' && economy.getUserCardCount(toId) >= economy.getUser(toId).binder_capacity) { trades.deleteTrade(tradeId); return interaction.update({ content: '❌ Trade failed: recipient binder full.', embeds: [], components: [] }); }
    if (get.type === 'card' && economy.getUserCardCount(fromId) >= economy.getUser(fromId).binder_capacity) { trades.deleteTrade(tradeId); return interaction.update({ content: '❌ Trade failed: your binder is full.', embeds: [], components: [] }); }

    if (give.type === 'money') { economy.updateBalance(fromId, -give.amount); economy.updateBalance(toId, give.amount); }
    else { economy.removeOneCopy(fromId, give.cardId); economy.giveCard(toId, give.cardId); }

    if (get.type === 'money') { economy.updateBalance(toId, -get.amount); economy.updateBalance(fromId, get.amount); }
    else { economy.removeOneCopy(toId, get.cardId); economy.giveCard(fromId, get.cardId); }

    db.prepare(`UPDATE users SET trades_completed = trades_completed + 1 WHERE user_id IN (?, ?)`).run(fromId, toId);
    trades.deleteTrade(tradeId);

    await interaction.update({ content: `✅ Trade completed between <@${fromId}> and <@${toId}>!`, embeds: [], components: [] });
  }
}

module.exports = { handleButton };