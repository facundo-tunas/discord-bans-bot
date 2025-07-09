import {
  ActionRowBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  ComponentType,
} from "discord.js";
import config from "../config.js";
import { hasPeriodistaRole } from "../utils/hasPermissions.js";

const NEWS_SOURCES = {
  espn: {
    name: "ESPN",
    avatar:
      "https://cdn.iconscout.com/icon/free/png-256/free-espn-1-461787.png?f=webp",
    handle: "@ESPNF1",
    color: 0xd50000,
  },
  dazn: {
    name: "DAZN",
    avatar: "https://cdn.worldvectorlogo.com/logos/dazn.svg",
    handle: "@DAZN_ES",
    color: 0xffd700,
  },
  skysports: {
    name: "Sky Sports",
    avatar:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS7bQokmb2_lgo6F0KKXCWp0gZBDxtqSHibfQ&s",
    handle: "@SkySportsF1",
    color: 0x0078d4,
  },
};

export default {
  data: new SlashCommandBuilder()
    .setName("noticias")
    .setDescription("Envía una noticia al canal de noticias."),
  async execute(interaction) {
    // if (!hasPeriodistaRole(interaction.member)) {
    //   return interaction.reply({
    //     content: "No tienes permisos para enviar noticias.",
    //     ephemeral: true
    //   });
    // }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("newsSourceSelect")
      .setPlaceholder("Selecciona la fuente de noticias...")
      .addOptions([
        {
          label: "ESPN",
          description: "ESPN",
          value: "espn",
        },
        {
          label: "DAZN",
          description: "DAZN",
          value: "dazn",
        },
        {
          label: "Sky Sports",
          description: "Sky Sports",
          value: "skysports",
        },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: "Selecciona la fuente de noticias:",
      components: [row],
      ephemeral: true,
    });

    const filter = (i) =>
      i.customId === "newsSourceSelect" && i.user.id === interaction.user.id;

    try {
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        componentType: ComponentType.StringSelect,
        time: 60_000,
        max: 1,
      });

      collector.on("collect", async (selectInteraction) => {
        const selectedSource = selectInteraction.values[0];
        const sourceConfig = NEWS_SOURCES[selectedSource];

        const modal = new ModalBuilder()
          .setCustomId("newsModal")
          .setTitle(`Enviar Noticia - ${sourceConfig.name}`);

        const titleInput = new TextInputBuilder()
          .setCustomId("titleInput")
          .setLabel("Título de la noticia")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
          .setPlaceholder("Ej: Gran victoria de Max Verstappen");

        const contentInput = new TextInputBuilder()
          .setCustomId("contentInput")
          .setLabel("Contenido de la noticia")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(2000)
          .setPlaceholder("Escribe aquí el cuerpo de la noticia...");

        const showAuthorInput = new TextInputBuilder()
          .setCustomId("showAuthorInput")
          .setLabel("Mostrar autor? (si/no)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(3)
          .setPlaceholder("si o no")
          .setValue("no");

        const imageInput = new TextInputBuilder()
          .setCustomId("imageInput")
          .setLabel("URL de imagen (opcional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder("https://ejemplo.com/imagen.jpg");

        const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
        const secondActionRow = new ActionRowBuilder().addComponents(
          contentInput
        );
        const thirdActionRow = new ActionRowBuilder().addComponents(
          showAuthorInput
        );
        const fourthActionRow = new ActionRowBuilder().addComponents(
          imageInput
        );

        modal.addComponents(
          firstActionRow,
          secondActionRow,
          thirdActionRow,
          fourthActionRow
        );

        await selectInteraction.showModal(modal);
        const modalFilter = (interaction) =>
          interaction.customId === "newsModal";

        try {
          const modalSubmission = await selectInteraction.awaitModalSubmit({
            filter: modalFilter,
            time: 600_000,
          });

          const title = modalSubmission.fields.getTextInputValue("titleInput");
          const content = modalSubmission.fields
            .getTextInputValue("contentInput")
            .replace(/\\n/g, "\n");
          const showAuthorText = modalSubmission.fields
            .getTextInputValue("showAuthorInput")
            .toLowerCase();
          const showAuthor =
            showAuthorText === "si" ||
            showAuthorText === "sí" ||
            showAuthorText === "yes";
          const imageUrl =
            modalSubmission.fields.getTextInputValue("imageInput");

          await modalSubmission.deferReply({ ephemeral: true });

          const guild = modalSubmission.guild;
          const newsChannel = await guild.channels.fetch(config.newsChannel);

          if (!newsChannel || !newsChannel.isTextBased()) {
            return modalSubmission.editReply({
              content: "No se pudo encontrar el canal de noticias.",
            });
          }

          const webhooks = await newsChannel.fetchWebhooks();
          let webhook = webhooks.find((wh) => wh.name === sourceConfig.name);

          if (!webhook) {
            webhook = await newsChannel.createWebhook({
              name: sourceConfig.name,
              avatar: sourceConfig.avatar,
              reason: `Webhook para noticias de ${sourceConfig.name}`,
            });
          }

          const xEmoji = guild.emojis.cache
            .find((emoji) => emoji.name === "x_")
            ?.toString();
          const checkEmoji = guild.emojis.cache
            .find((emoji) => emoji.name === "verificar")
            ?.toString();

          const header = `${xEmoji} ${sourceConfig.name} ${checkEmoji}\n${sourceConfig.handle}`;
          const authorMention = `<@${modalSubmission.user.id}>`;

          let finalMessage;
          if (title === "0") finalMessage = `${header}\n\n${content}`;
          else {
            finalMessage = `${header}\n## ${title}\n\n${content}`;
          }

          if (showAuthor) {
            finalMessage += `\n\n— vía ${authorMention}`;
          }

          const webhookPayload = {
            content: finalMessage,
            username: sourceConfig.name,
            avatarURL: sourceConfig.avatar,
          };

          if (imageUrl) {
            try {
              new URL(imageUrl);
              webhookPayload.embeds = [
                {
                  image: { url: imageUrl },
                  color: sourceConfig.color,
                },
              ];
            } catch (error) {
              console.error("Invalid image URL provided:", imageUrl);
              await modalSubmission.followUp({
                content: "⚠️ La URL de la imagen no es válida y fue ignorada.",
                ephemeral: true,
              });
            }
          }

          await webhook.send(webhookPayload);

          await modalSubmission.editReply({
            content: `Noticia enviada al canal como ${sourceConfig.name} :3`,
          });
        } catch (error) {
          console.error("Error processing news modal:", error);
          if (!selectInteraction.replied) {
            await selectInteraction.followUp({
              content: "Hubo un error al procesar tu noticia.",
              ephemeral: true,
            });
          }
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time" && collected.size === 0) {
          await interaction.editReply({
            content: "Se agotó el tiempo para seleccionar una fuente.",
            components: [],
          });
        }
      });
    } catch (error) {
      console.error("Error with source selection:", error);
      await interaction.editReply({
        content: "Hubo un error al procesar la selección de fuente.",
        components: [],
      });
    }
  },
};
