const { SlashCommandBuilder } = require('discord.js');
const economy = require('../utils/economy');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder().setName('work').setDescription('Work to earn eyebucks!'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = economy.getUser(userId);
    const now = Date.now();
    const remaining = (user.last_work + config.WORK_COOLDOWN_MS) - now;

    if (remaining > 0) {
      const minutes = Math.ceil(remaining / 60000);
      return interaction.reply({ content: `⏳ You're tired! Rest **${minutes} more minute(s)**.` });
    }

    const amount = economy.pickWorkAmount();
    economy.updateBalance(userId, amount);
    economy.setLastWork(userId, now);

    const jobs = [
      'streamed KATSEYE MVs all night', 'sold Eyekons lightsticks at a pop-up',
      'ran the KATSEYE fancam account', 'organized a group order for photocards',
      'live-tweeted a comeback stage',
    ];
    const job = jobs[Math.floor(Math.random() * jobs.length)];

    await interaction.reply(`💼 You ${job} and earned **${amount} eyebucks**! 👁️💰`);
  },
};