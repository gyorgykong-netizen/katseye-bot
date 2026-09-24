const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../data/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View server leaderboards')
    .addStringOption(opt => opt.setName('type').setDescription('Leaderboard type').setRequired(true)
      .addChoices({ name: 'Most Eyebucks', value: 'money' }, { name: 'Most Trades', value: 'trades' }, { name: 'Most Sets Completed', value: 'sets' })),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    let rows, title, formatLine;

    if (type === 'money') {
      rows = db.prepare(`SELECT user_id, balance FROM users ORDER BY balance DESC LIMIT 10`).all();
      title = '💰 Richest Eyekons';
      formatLine = (r, i) => `**${i + 1}.** <@${r.user_id}> — ${r.balance} eyebucks`;
    } else if (type === 'trades') {
      rows = db.prepare(`SELECT user_id, trades_completed FROM users ORDER BY trades_completed DESC LIMIT 10`).all();
      title = '🔁 Top Traders';
      formatLine = (r, i) => `**${i + 1}.** <@${r.user_id}> — ${r.trades_completed} trades`;
    } else {
      rows = db.prepare(`SELECT user_id, COUNT(*) as sets FROM set_completions GROUP BY user_id ORDER BY sets DESC LIMIT 10`).all();
      title = '✅ Most Sets Completed';
      formatLine = (r, i) => `**${i + 1}.** <@${r.user_id}> — ${r.sets} sets`;
    }

    const embed = new EmbedBuilder().setTitle(title).setColor(0xFF2D95).setDescription(rows.length ? rows.map(formatLine).join('\n') : 'No data yet!');
    await interaction.reply({ embeds: [embed] });
  },
};