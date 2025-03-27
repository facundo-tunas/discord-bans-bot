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
const ALLOWED_USERS = ["752939088734060567", "211986166952624128"];
const RULES_PATH = path.join(__dirname, "../data/rules.json");

export default {
  data: new SlashCommandBuilder()
    .setName("rules")
    .setDescription("Gestiona las reglas del servidor")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
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
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("show")
        .setDescription("Muestra una regla aleatoria del canal")
    ),
  // .addSubcommand((subcommand) =>
  //   subcommand
  //     .setName("configure")
  //     .setDescription(
  //       "Crea un canal de reglas y muestra todas las reglas del servidor"
  //     )
  //     .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  // ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "add":
        await this.addRule(interaction);
        break;
      case "show":
        await this.showRandomRule(interaction);
        break;
      case "configure":
        await this.configureRulesChannel(interaction);
        break;
    }
  },

  async addRule(interaction) {
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

      let rulesData;
      try {
        rulesData = JSON.parse(fs.readFileSync(RULES_PATH, "utf8"));
      } catch (readError) {
        rulesData = { rules: [] };
      }

      const generateUniqueRuleId = () => {
        while (true) {
          const newId = Math.floor(Math.random() * 100000) + 1;
          const idExists = rulesData.rules.some((rule) => rule.id === newId);
          if (!idExists) return newId;
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

      fs.writeFileSync(RULES_PATH, JSON.stringify(rulesData, null, 2), "utf8");

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

  async showRandomRule(interaction) {
    try {
      if (!fs.existsSync(RULES_PATH)) {
        return await interaction.reply({
          content: "El archivo de reglas no existe.",
          ephemeral: true,
        });
      }

      const rulesData = JSON.parse(fs.readFileSync(RULES_PATH, "utf8"));

      if (!rulesData.rules || rulesData.rules.length === 0) {
        return await interaction.reply({
          content: "No hay reglas definidas en el archivo.",
          ephemeral: true,
        });
      }

      const randomRule =
        rulesData.rules[Math.floor(Math.random() * rulesData.rules.length)];

      const embed = new EmbedBuilder()
        .setTitle("Regla del Canal")
        .setDescription(randomRule.text)
        .setColor("Blue")
        .setFooter({
          text: `Regla #${randomRule.id || "N/A"}`,
          iconURL: interaction.client.user.displayAvatarURL(),
        });

      if (randomRule.imageUrl) {
        embed.setThumbnail(randomRule.imageUrl);
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error al ejecutar el comando /rules show:", error);
      await interaction.reply({
        content: "Hubo un error al obtener una regla aleatoria.",
        ephemeral: true,
      });
    }
  },

  // async configureRulesChannel(interaction) {
  //   await interaction.deferReply({ ephemeral: true });
  //   try {
  //     if (!fs.existsSync(RULES_PATH)) {
  //       return await interaction.editReply({
  //         content: "El archivo de reglas no existe.",
  //         ephemeral: true,
  //       });
  //     }

  //     const rulesData = JSON.parse(fs.readFileSync(RULES_PATH, "utf8"));

  //     if (!rulesData.rules || rulesData.rules.length === 0) {
  //       return await interaction.editReply({
  //         content: "No hay reglas definidas en el archivo.",
  //         ephemeral: true,
  //       });
  //     }

  //     const rulesChannel = await interaction.guild.channels.create({
  //       name: "📜-reglas-importantes",
  //       type: ChannelType.GuildText,
  //       topic: "Reglas Oficiales y Directrices del Servidor",
  //       position: 0,
  //     });

  //     const ruleEmbeds = rulesData.rules.map((rule, index) => {
  //       const embed = new EmbedBuilder()
  //         .setTitle(`Regla #${rule.id || index + 1}`)
  //         .setDescription(rule.text)
  //         .setColor("Blue")
  //         .setFooter({
  //           text: interaction.guild.name,
  //           iconURL: interaction.guild.iconURL() || undefined,
  //         });

  //       if (rule.punishment) {
  //         embed.addFields({
  //           name: "Castigo",
  //           value: rule.punishment,
  //         });
  //       }

  //       if (rule.imageUrl) {
  //         embed.setThumbnail(rule.imageUrl);
  //       }

  //       return embed;
  //     });

  //     for (const embed of ruleEmbeds) {
  //       await rulesChannel.send({ embeds: [embed] });
  //     }

  //     const firstMessage = await rulesChannel.messages.fetch({ limit: 1 });
  //     await firstMessage.first().pin();

  //     await interaction.editReply({
  //       content: `✅ Canal de reglas creado en ${rulesChannel}`,
  //     });
  //   } catch (error) {
  //     console.error("Error configurando el canal de reglas:", error);
  //     await interaction.editReply({
  //       content: "Hubo un error al configurar el canal de reglas.",
  //       ephemeral: true,
  //     });
  //   }
  // },
};
