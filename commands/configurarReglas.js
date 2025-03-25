import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  data: new SlashCommandBuilder()
    .setName("configurar-reglas")
    .setDescription(
      "Crea un canal de reglas y muestra todas las reglas del servidor"
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    interaction.deferReply({ ephemeral: true });
    try {
      const rulesPath = path.join(__dirname, "../data/rules.json");

      if (!fs.existsSync(rulesPath)) {
        return await interaction.reply({
          content: "El archivo de reglas no existe.",
          ephemeral: true,
        });
      }

      const rulesData = JSON.parse(fs.readFileSync(rulesPath, "utf8"));

      if (!rulesData.rules || rulesData.rules.length === 0) {
        return await interaction.reply({
          content: "No hay reglas definidas en el archivo.",
          ephemeral: true,
        });
      }

      const rulesChannel = await interaction.guild.channels.create({
        name: "📜-reglas-importantes",
        type: ChannelType.GuildText,
        topic: "Reglas Oficiales y Directrices del Servidor",
        position: 0,
      });

      const ruleEmbeds = rulesData.rules.map((rule, index) => {
        const embed = new EmbedBuilder()
          .setTitle(`Regla #${rule.id || index + 1}`)
          .setDescription(rule.text)
          .setColor("Blue")
          .setFooter({
            text: interaction.guild.name,
            iconURL: interaction.guild.iconURL() || undefined,
          });

        if (rule.punishment) {
          embed.addFields({
            name: "Castigo",
            value: rule.punishment,
          });
        }

        if (rule.imageUrl) {
          embed.setThumbnail(rule.imageUrl);
        }

        return embed;
      });

      for (const embed of ruleEmbeds) {
        await rulesChannel.send({ embeds: [embed] });
      }

      const firstMessage = await rulesChannel.messages.fetch({ limit: 1 });
      await firstMessage.first().pin();

      await interaction.editReply({
        content: `✅ Canal de reglas creado en ${rulesChannel}`,
      });
    } catch (error) {
      console.error("Error configurando el canal de reglas:", error);
      await interaction.reply({
        content: "Hubo un error al configurar el canal de reglas.",
        ephemeral: true,
      });
    }
  },
};
