require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const cardsData = require('./data/cards');
const { handleButton } = require('./interactions/buttons');
const { handleSelect } = require('./interactions/selects');

cardsData.syncCardsToDatabase();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if (command && command.data && command.data.name) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`❌ WARNING: ${file} is missing 'data' or 'module.exports'!`);
  }
}

client.once(Events.ClientReady, c => {
  console.log(`✅ Logged in as ${c.user.tag}`);

  const statuses = [
    { name: 'for /pull ✨', type: 3 },        // "Watching for /pull"
    { name: 'KATSEYE photocards 👁️', type: 3 }, // "Watching KATSEYE..."
    { name: '/binder for your collection', type: 0 }, // "Playing /binder..."
  ];

  let i = 0;
  c.user.setPresence({ activities: [statuses[i]], status: 'online' });

  setInterval(() => {
    i = (i + 1) % statuses.length;
    c.user.setPresence({ activities: [statuses[i]], status: 'online' });
  }, 15000); // rotates every 15 seconds
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
    } else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command?.autocomplete) await command.autocomplete(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
    }
  } catch (err) {
    console.error(err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
  await interaction.reply({ content: '❌ Something went wrong!' }).catch(() => {});
}
  }
});

client.login(process.env.DISCORD_TOKEN);