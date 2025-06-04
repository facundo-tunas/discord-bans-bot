import { SlashCommandBuilder } from "discord.js";
import config from "../config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("breves")
    .setDescription("En Breves."),
  async execute(interaction) {
    const guild = interaction.guild;
    const generalChannel = await guild.channels.fetch(config.generalChannel);

    if (!generalChannel || !generalChannel.isTextBased()) {
      return interaction.reply({
        content: "No se pudo encontrar el canal general.",
        ephemeral: true,
      });
    }

    const webhooks = await generalChannel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.name === "CHARLES LECLERC");

    if (!webhook) {
      webhook = await generalChannel.createWebhook({
        name: "CHARLES LECLERC",
        avatar:
          "https://images-ext-1.discordapp.net/external/FZ4QpkLnjDt9J-Mv1jtTsiAYp6vx5d-BMBztXSZ250I/%3Fsize%3D4096%26ignore%3Dtrue%29./https/cdn.discordapp.com/avatars/360975862545514496/c8881b916e618613038b919d41ca5502.png?format=webp&quality=lossless",
        reason: "Webhook para En Breves",
      });
    }

    await webhook.send({
      content: "en breves",
      username: "CHARLES LECLERC",
      avatar:
        "https://images-ext-1.discordapp.net/external/FZ4QpkLnjDt9J-Mv1jtTsiAYp6vx5d-BMBztXSZ250I/%3Fsize%3D4096%26ignore%3Dtrue%29./https/cdn.discordapp.com/avatars/360975862545514496/c8881b916e618613038b919d41ca5502.png?format=webp&quality=lossless",
    });

    await interaction.reply({
      content: "Mensaje enviado al canal general :3",
      ephemeral: true,
    });
  },
};
