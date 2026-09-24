const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cardsData = require('../data/cards');

function encode(str) { return Buffer.from(str, 'utf8').toString('base64url'); }
function decode(str) { return Buffer.from(str, 'base64url').toString('utf8'); }

function buildEraSelect(scope) {
  const options = cardsData.VALID_ERAS.map(era => ({ label: era, value: encode(era) }));
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`browse:${scope}:era`)
    .setPlaceholder('Select an era')
    .addOptions(options);
  return new ActionRowBuilder().addComponents(menu);
}

const SETS_PER_PAGE = 25;

function buildSetSelect(scope, era, userId, page = 0) {
  const allSets = scope === 'binder' ? cardsData.getSetsOwnedByUser(userId, era) : cardsData.getSetsForEra(era);
  if (allSets.length === 0) return null;

  const totalPages = Math.ceil(allSets.length / SETS_PER_PAGE);
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));
  const pageSets = allSets.slice(currentPage * SETS_PER_PAGE, currentPage * SETS_PER_PAGE + SETS_PER_PAGE);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`browse:${scope}:set:${encode(era)}:${currentPage}`)
    .setPlaceholder(`Select a set (Page ${currentPage + 1}/${totalPages})`)
    .addOptions(pageSets.map(s => ({ label: s.slice(0, 100), value: encode(s) })));

  const rows = [new ActionRowBuilder().addComponents(menu)];

  if (totalPages > 1) {
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`setpage:${scope}:${encode(era)}:${currentPage - 1}`)
        .setLabel('⬅ Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId(`setpage:${scope}:${encode(era)}:${currentPage + 1}`)
        .setLabel('Next ➡')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1),
    );
    rows.push(navRow);
  }

  return { rows, totalPages, currentPage };
}

const CARDS_PER_PAGE = 25; // Discord max: 5 rows x 5 buttons

function buildCardButtons(scope, era, setName, userId, page = 0) {
  const allCards = scope === 'binder'
    ? cardsData.getOwnedCardsForSet(userId, era, setName)
    : cardsData.getCardsForSet(era, setName);
  if (allCards.length === 0) return { rows: [], cards: [], totalPages: 0, currentPage: 0 };

  const totalPages = Math.ceil(allCards.length / CARDS_PER_PAGE);
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));
  const cards = allCards.slice(currentPage * CARDS_PER_PAGE, currentPage * CARDS_PER_PAGE + CARDS_PER_PAGE);

  const rows = [];
  for (let i = 0; i < cards.length; i += 5) {
    const chunk = cards.slice(i, i + 5);
    rows.push(new ActionRowBuilder().addComponents(
      chunk.map(card => new ButtonBuilder()
        .setCustomId(`view:${scope}:${card.id}:${encode(era)}:${encode(setName)}`)
        .setLabel(scope === 'binder' ? `${card.name} (${card.copies}x)` : card.name)
        .setStyle(ButtonStyle.Secondary))
    ));
  }

  if (totalPages > 1 && rows.length < 5) {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cardpage:${scope}:${encode(era)}:${encode(setName)}:${currentPage - 1}`)
        .setLabel('⬅ Prev')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId(`cardpage:${scope}:${encode(era)}:${encode(setName)}:${currentPage + 1}`)
        .setLabel('Next ➡')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage >= totalPages - 1),
    ));
  }

  return { rows, cards, totalPages, currentPage };
}

module.exports = { encode, decode, buildEraSelect, buildSetSelect, buildCardButtons };