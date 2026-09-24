const { SlashCommandBuilder } = require('discord.js');
const cardsData = require('../data/cards');
const economy = require('../utils/economy');
const config = require('../config');
const { buildCardEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('pull').setDescription('Pull a random photocard!'),

  async execute(interaction) {
    const userId = interaction.user.id;
    let user = economy.getUser(userId);

    const now = Date.now();
    const remaining = (user.last_pull + config.PULL_COOLDOWN_MS) - now;
    if (remaining > 0) {
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.ceil((remaining % 60000) / 1000);
      return interaction.reply({ content: `⏳ You need to wait **${minutes}m ${seconds}s** before pulling again!` });
    }

    const cardCount = economy.getUserCardCount(userId);
    if (cardCount >= user.binder_capacity) {
      return interaction.reply({
        content: `📕 Your binder is full (**${cardCount}/${user.binder_capacity}**)! Buy a bigger one with \`/shop buy-binder\` or \`/sell\` some cards.`,
      });
    }

    const rarity = economy.pickRarity();
    const card = cardsData.getRandomCardByRarity(rarity);

    if (!card) {
      return interaction.reply({
        content: `😢 No **${rarity}** cards exist yet. Ask the bot owner to add some to \`pocas/photocards.txt\`.`,
      });
    }

    economy.setLastPull(userId, now);

    const ownedBefore = economy.getOwnedCopies(userId, card.id);
    economy.giveCard(userId, card.id);
    const isDuplicate = ownedBefore > 0;

    const { embeds, files } = buildCardEmbed(card, { owned: ownedBefore + 1 });
    embeds[0].setFooter({ text: `${interaction.user.username} pulled a ${rarity} card! ${isDuplicate ? '(Duplicate)' : '(NEW!)'}` });

    const messages = [];
    if (isDuplicate) {
      const wishlisters = economy.getWishlistersForCard(card.id).filter(id => id !== userId);
      if (wishlisters.length) {
        messages.push(`💌 ${wishlisters.map(id => `<@${id}>`).join(', ')} ${wishlisters.length > 1 ? 'have' : 'has'} **${card.name}** on their wishlist!`);
      }
    }

    const completion = economy.checkAndRewardSetCompletion(userId, card.era, card.set_name);
    if (completion) {
      messages.push(`🎉 **SET COMPLETE!** ${interaction.user.username} finished **${card.era} - ${card.set_name}** and earned **${completion.reward} eyebucks**! 💸`);
    }

    await interaction.reply({ embeds, files, content: messages.join('\n') || undefined });
  },
};