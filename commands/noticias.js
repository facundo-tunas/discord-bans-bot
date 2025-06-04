import { SlashCommandBuilder } from "discord.js";
import config from "../config.js";
import { hasPeriodistaRole } from "../utils/hasPermissions.js";

export default {
  data: new SlashCommandBuilder()
    .setName("noticias")
    .setDescription("Envía una noticia al canal de noticias.")
    .addStringOption((option) =>
      option
        .setName("titulo")
        .setDescription("El título de la noticia (aparecerá en negrita)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("contenido")
        .setDescription("El contenido de la noticia")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("mostrar_autor")
        .setDescription("Mostrar '— vía @usuario' al final del mensaje")
        .setRequired(true)
    )
    .addAttachmentOption((option) =>
      option
        .setName("imagen")
        .setDescription("Imagen para acompañar la noticia")
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // if (!hasPeriodistaRole(interaction.member)) {
    //   return interaction.editReply({
    //     content: "No tienes permisos para enviar noticias.",
    //   });
    // }

    const title = interaction.options.getString("titulo");
    const content = interaction.options
      .getString("contenido")
      .replace(/\\n/g, "\n");
    const showAuthor = interaction.options.getBoolean("mostrar_autor");
    const imageAttachment = interaction.options.getAttachment("imagen");

    const guild = interaction.guild;
    const newsChannel = await guild.channels.fetch(config.newsChannel);

    if (!newsChannel || !newsChannel.isTextBased()) {
      return interaction.editReply({
        content: "No se pudo encontrar el canal de noticias.",
      });
    }

    const webhooks = await newsChannel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.name === "ESPN");

    if (!webhook) {
      webhook = await newsChannel.createWebhook({
        name: "ESPN",
        avatar:
          "https://cdn.iconscout.com/icon/free/png-256/free-espn-1-461787.png?f=webp",
        reason: "Webhook para noticias",
      });
    }

    const xEmoji = guild.emojis.cache
      .find((emoji) => emoji.name === "x_")
      ?.toString();
    const checkEmoji = guild.emojis.cache
      .find((emoji) => emoji.name === "verificar")
      ?.toString();

    const header = `${xEmoji} ESPN ${checkEmoji}\n@ESPNF1`;
    const authorMention = `<@${interaction.user.id}>`;

    let finalMessage = `${header}\n## ${title}\n\n${content}`;
    if (showAuthor) {
      finalMessage += `\n\n— vía ${authorMention}`;
    }

    const webhookPayload = {
      content: finalMessage,
      username: "ESPN",
      avatarURL:
        "https://cdn.iconscout.com/icon/free/png-256/free-espn-1-461787.png?f=webp",
    };

    if (imageAttachment) {
      webhookPayload.files = [imageAttachment];
    }

    await webhook.send(webhookPayload);

    await interaction.editReply({
      content: "Noticia enviada al canal :3",
    });
  },
};
