import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data/config.json");
// Function to load config
function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const defaultConfig = {
        activeListMessageId: null,
        activeListChannelId: null,
        activeListGuildId: null,
      };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }

    const configData = fs.readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(configData);
  } catch (error) {
    console.error("Error loading config:", error);
    return { activeListMessageId: null };
  }
}

function saveConfig(configData) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));
  } catch (error) {
    console.error("Error saving config:", error);
  }
}

export function saveActiveListMessage(messageId, channelId, guildId) {
  const config = loadConfig();
  config.activeListMessageId = messageId;
  config.activeListChannelId = channelId;
  config.activeListGuildId = guildId;
  saveConfig(config);
  console.log(
    `Saved active list message: ${messageId} in channel ${channelId}`
  );
}

export function getActiveListMessage() {
  const config = loadConfig();

  if (config.activeListMessageId && !config.activeListChannelId) {
    return config.activeListMessageId;
  }

  if (config.activeListMessageId) {
    return {
      messageId: config.activeListMessageId,
      channelId: config.activeListChannelId,
      guildId: config.activeListGuildId,
    };
  }

  return null;
}

export function clearActiveListMessage() {
  const config = loadConfig();
  config.activeListMessageId = null;
  config.activeListChannelId = null;
  config.activeListGuildId = null;
  saveConfig(config);
}
