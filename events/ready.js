import { ActivityType } from "discord.js";

export default {
  name: "ready",
  once: true,
  async execute(client) {
    try {
      const warningsChannel = client.channels.cache.find(
        (channel) => channel.name === "bot-warnings"
      );

      if (process.env.HIDDEN === "true") {
        console.log("Hidden instance started!");
      } else if (warningsChannel) {
        await warningsChannel.send(`🤖 BOT ENCENDIDO`);
        console.log(`Bot is ready! Logged in as ${client.user.tag}`);
      } else {
        console.log(
          `Bot is ready but could not find 'bot-warnings' channel. Logged in as ${client.user.tag}`
        );
      }
      client.user.setActivity("a Kevin...", {
        type: ActivityType.Watching,
      });
    } catch (error) {
      console.error("Error in ready event:", error);
    }
  },
};
