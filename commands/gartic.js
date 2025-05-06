import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  AttachmentBuilder,
} from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GIFS_PATH = path.join(__dirname, "../data/gifs"); // Path to folder containing GIFs

export default {
  data: new SlashCommandBuilder()
    .setName("garticgifs")
    .setDescription("Gestiona los GIFs de Gartic Phone")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("subir")
        .setDescription("Sube todos los GIFs al canal de Gartic Phone")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("aleatorio")
        .setDescription("Muestra un GIF aleatorio de Gartic Phone")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "subir":
        await this.uploadAllGifs(interaction);
        break;
      case "aleatorio":
        await this.showRandomGif(interaction);
        break;
    }
  },

  async uploadAllGifs(interaction) {
    if (!interaction.member.permissions.has("Administrator")) {
      return await interaction.reply({
        content:
          "No tienes permiso para usar este comando. Se requieren permisos de administrador.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      if (!fs.existsSync(GIFS_PATH)) {
        fs.mkdirSync(GIFS_PATH, { recursive: true });
        return await interaction.editReply({
          content: `La carpeta de GIFs no existe. Se ha creado en ${GIFS_PATH}. Por favor, añade GIFs a esta carpeta.`,
        });
      }

      const files = fs
        .readdirSync(GIFS_PATH)
        .filter((file) => file.toLowerCase().endsWith(".gif"));

      if (files.length === 0) {
        return await interaction.editReply({
          content: `No se encontraron archivos GIF en ${GIFS_PATH}. Por favor, añade GIFs a esta carpeta.`,
        });
      }

      let garticChannel = interaction.guild.channels.cache.find(
        (channel) => channel.name.toLowerCase() === "gartic-phone"
      );

      if (!garticChannel) {
        garticChannel = await interaction.guild.channels.create({
          name: "gartic-phone",
          type: ChannelType.GuildText,
          topic: "GIFs y momentos divertidos de Gartic Phone",
        });
      }

      await interaction.editReply({
        content: `Iniciando la subida de ${files.length} GIFs al canal ${garticChannel}. Esto puede tardar un momento...`,
      });

      let uploadCount = 0;
      const batchSize = 5; // Upload 5 GIFs at a time

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        if (i % 20 === 0 && i > 0) {
          await interaction.editReply({
            content: `Subiendo GIFs... Progreso: ${i}/${files.length}`,
          });
        }

        const promises = batch.map(async (gifFile) => {
          try {
            const filePath = path.join(GIFS_PATH, gifFile);
            const fileStats = fs.statSync(filePath);

            if (fileStats.size > 8 * 1024 * 1024) {
              console.warn(
                `Archivo demasiado grande: ${gifFile} (${fileStats.size} bytes)`
              );
              return false;
            }

            const attachment = new AttachmentBuilder(filePath, {
              name: gifFile,
            });

            await garticChannel.send({
              content: `GIF: ${gifFile.replace(".gif", "")}`,
              files: [attachment],
            });

            return true;
          } catch (err) {
            console.error(`Error con el archivo ${gifFile}:`, err);
            return false;
          }
        });

        const results = await Promise.all(promises);
        uploadCount += results.filter((result) => result === true).length;

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const successEmbed = new EmbedBuilder()
        .setTitle("GIFs Subidos Exitosamente")
        .setDescription(
          `Se han subido ${uploadCount} de ${files.length} GIFs al canal ${garticChannel}.`
        )
        .setColor("Green")
        .setTimestamp();

      await interaction.editReply({
        content: null,
        embeds: [successEmbed],
      });
    } catch (error) {
      console.error("Error al subir GIFs:", error);
      await interaction.editReply({
        content: `Hubo un error al subir los GIFs: ${error.message}`,
        ephemeral: true,
      });
    }
  },

  async showRandomGif(interaction) {
    try {
      await interaction.deferReply();

      const garticChannel = interaction.guild.channels.cache.find(
        (channel) => channel.name.toLowerCase() === "gartic-phone"
      );

      if (!garticChannel) {
        return await interaction.editReply({
          content:
            "No se encontró el canal de Gartic Phone. Primero usa `/garticgifs subir` para crear el canal y subir GIFs.",
        });
      }

      const messages = await garticChannel.messages.fetch({ limit: 100 });

      const messagesWithGifs = messages.filter(
        (msg) =>
          msg.attachments.size > 0 &&
          msg.attachments.some(
            (attachment) =>
              attachment.name && attachment.name.toLowerCase().endsWith(".gif")
          )
      );

      if (messagesWithGifs.size === 0) {
        return await interaction.editReply({
          content:
            "No se encontraron GIFs en el canal de Gartic Phone. Primero usa `/garticgifs subir` para subir GIFs.",
        });
      }

      const randomIndex = Math.floor(Math.random() * messagesWithGifs.size);
      const randomMessage = Array.from(messagesWithGifs.values())[randomIndex];

      const gifAttachment = randomMessage.attachments.find(
        (attachment) =>
          attachment.name && attachment.name.toLowerCase().endsWith(".gif")
      );

      await interaction.editReply({
        content: gifAttachment.url,
      });
    } catch (error) {
      console.error("Error al mostrar un GIF aleatorio:", error);
      await interaction.editReply({
        content: `Hubo un error al mostrar un GIF aleatorio: ${error.message}`,
      });
    }
  },
};
