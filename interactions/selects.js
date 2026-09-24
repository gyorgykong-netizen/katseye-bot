const { EmbedBuilder } = require('discord.js');
const browser = require('../utils/browser');

async function handleSelect(interaction) {
  const [prefix, scope, step, eraEnc] = interaction.customId.split(':');
  if (prefix !== 'browse') return;

  if (step === 'era') {
    const era = browser.decode(interaction.values[0]);
    const result = browser.buildSetSelect(scope, era, interaction.user.id, 0);
    if (!result) {
      return interaction.update({ content: `No sets found for **${era}**${scope === 'binder' ? ' in your binder' : ''}.`, embeds: [], components: [] });
    }
    const embed = new EmbedBuilder().setTitle(era).setDescription(`Now pick a set! (Page ${result.currentPage + 1}/${result.totalPages})`).setColor(0xFF2D95);
    return interaction.update({ content: null, embeds: [embed], components: result.rows });
  }

  if (step === 'set') {
    const era = browser.decode(eraEnc);
    const setName = browser.decode(interaction.values[0]);
    const { rows, cards, totalPages, currentPage } = browser.buildCardButtons(scope, era, setName, interaction.user.id, 0);
    if (cards.length === 0) {
      return interaction.update({ content: `You don't own any cards from **${era} - ${setName}** yet.`, embeds: [], components: [] });
    }
    const embed = new EmbedBuilder()
      .setTitle(`${era} — ${setName}`)
      .setDescription(`Click a card to view it!${totalPages > 1 ? ` (Page ${currentPage + 1}/${totalPages})` : ''}`)
      .setColor(0xFF2D95);
    return interaction.update({ content: null, embeds: [embed], components: rows });
  }
}

module.exports = { handleSelect };