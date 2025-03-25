import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALLOWED_USERS = ["752939088734060567", "211986166952624128"];

export default {
  data: new SlashCommandBuilder()
    .setName("agregar-regla")
    .setDescription("Agrega una nueva regla al servidor")
    .addStringOption((option) =>
      option
        .setName("texto")
        .setDescription("Texto de la nueva regla")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("castigo")
        .setDescription("Descripción del castigo por incumplir la regla")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("imagen")
        .setDescription("URL de imagen opcional para la regla")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!ALLOWED_USERS.includes(interaction.user.id)) {
      return await interaction.reply({
        content: "No tienes permiso para agregar reglas. SOLO HOMIB Y URUWHY.",
        ephemeral: true,
      });
    }

    try {
      const ruleText = interaction.options.getString("texto");
      const rulePunishment = interaction.options.getString("castigo") || null;
      const ruleImage = interaction.options.getString("imagen") || null;

      const rulesPath = path.join(__dirname, "../data/rules.json");
      let rulesData;

      try {
        rulesData = JSON.parse(fs.readFileSync(rulesPath, "utf8"));
      } catch (readError) {
        rulesData = { rules: [] };
      }

      const generateUniqueRuleId = () => {
        while (true) {
          const newId = Math.floor(Math.random() * 100000) + 1;

          const idExists = rulesData.rules.some((rule) => rule.id === newId);

          if (!idExists) {
            return newId;
          }
        }
      };

      const newRuleId = generateUniqueRuleId();

      const newRule = {
        id: newRuleId,
        text: ruleText,
        punishment: rulePunishment,
        imageUrl: ruleImage,
      };

      rulesData.rules.push(newRule);

      fs.writeFileSync(rulesPath, JSON.stringify(rulesData, null, 2), "utf8");

      const confirmEmbed = new EmbedBuilder()
        .setTitle("Nueva Regla Agregada")
        .setDescription(`Regla #${newRuleId} ha sido añadida exitosamente.`)
        .addFields(
          { name: "Texto de la Regla", value: ruleText },
          {
            name: "Castigo",
            value: rulePunishment || "No se especificó un castigo específico",
          },
          { name: "Agregada por", value: interaction.user.username }
        )
        .setColor("Green")
        .setTimestamp();

      if (ruleImage) {
        confirmEmbed.setImage(ruleImage);
      }

      await interaction.reply({
        embeds: [confirmEmbed],
        ephemeral: false,
      });

      try {
        const guild = interaction.guild;
        const rulesChannel = guild.channels.cache.find(
          (channel) => channel.name === "📜-reglas-importantes"
        );

        if (rulesChannel) {
          const ruleEmbed = new EmbedBuilder()
            .setTitle(`Regla #${newRuleId}`)
            .setDescription(ruleText)
            .setColor("Blue")
            .setFooter({
              text: interaction.guild.name,
              iconURL: interaction.guild.iconURL() || undefined,
            });

          if (rulePunishment) {
            ruleEmbed.addFields({
              name: "Castigo",
              value: rulePunishment,
            });
          }

          if (ruleImage) {
            ruleEmbed.setThumbnail(ruleImage);
          }

          await rulesChannel.send({ embeds: [ruleEmbed] });
        }
      } catch (channelError) {
        console.error("Error al actualizar el canal de reglas:", channelError);
      }
    } catch (error) {
      console.error("Error al agregar la regla:", error);
      await interaction.reply({
        content: "Hubo un error al agregar la regla.",
        ephemeral: true,
      });
    }
  },
};
