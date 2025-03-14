import { REST, Routes } from "discord.js";
import { Client, GatewayIntentBits } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import config from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create commands array
const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = `./commands/${file}`;
  const command = await import(filePath);

  if ("data" in command.default && "execute" in command.default) {
    commands.push(command.default.data.toJSON());
    console.log(`Loaded command: ${command.default.data.name}`);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

console.log(process.env.DISCORD_TOKEN);
// Initialize Discord client to fetch guilds
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const rest = new REST({ version: "10" }).setToken(config.token);

// Login and deploy commands to all guilds
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag} to deploy commands`);

  // Get all guilds the bot is in
  const guilds = client.guilds.cache;
  console.log(`Bot is in ${guilds.size} guild(s)`);

  // Deploy commands to each guild
  for (const guild of guilds.values()) {
    try {
      console.log(`Deploying commands to guild: ${guild.name} (${guild.id})`);

      await rest.put(
        Routes.applicationGuildCommands(
          config.clientId,
          guild.id,
          config.token
        ),
        { body: commands }
      );

      console.log(`Successfully deployed commands to ${guild.name}`);
    } catch (error) {
      console.error(`Error deploying commands to guild ${guild.name}:`, error);
    }
  }

  console.log("Command deployment completed!");
  client.destroy(); // Properly close the client connection
});

// Handle login errors
client.on("error", (error) => {
  console.error("Client error:", error);
  client.destroy();
});

// Login to Discord
client.login(config.token).catch((error) => {
  console.error("Login error:", error);
});
