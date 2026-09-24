require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commands = [];
const seen = new Map();
const commandsPath = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if (!command?.data || !command?.execute) {
    console.warn(`⚠️  Skipping ${file} — missing 'data' or 'execute' export.`);
    continue;
  }

  const name = command.data.name;
  if (seen.has(name)) {
    console.error(`❌ DUPLICATE COMMAND NAME: "${name}" is defined in both "${seen.get(name)}" and "${file}"!`);
    process.exit(1);
  }
  seen.set(name, file);

  commands.push(command.data.toJSON());
  console.log(`✓ Loaded /${name} from ${file}`);
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);

    await rest.put(route, { body: commands });
    console.log(`✅ Registered ${commands.length} commands ${process.env.GUILD_ID ? '(guild)' : '(global)'}`);
  } catch (err) {
    console.error(err);
  }
})();