import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import {
  findUser,
  addWarning,
  removeWarning,
  clearWarnings,
  getAllUsers,
  permabanUser,
} from "../utils/dataHandler.js";

import { hasModeratorRole } from "../utils/hasPermissions.js";
import {
  handleListar,
  handleResetearLista,
  updatePersistentList,
} from "../scripts/listar.js";
import { warningsForBan } from "../utils/warningsUntilBan.js";
import config from "../config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("adv")
    .setDescription("Sistema de gestión de advertencias para usuarios")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("revisar")
        .setDescription("Revisar las advertencias de un usuario")
        .addStringOption((option) =>
          option
            .setName("nombre")
            .setDescription("El nombre del usuario a revisar")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("agregar")
        .setDescription("Agregar una advertencia a un usuario")
        .addStringOption((option) =>
          option
            .setName("nombre")
            .setDescription("El nombre del usuario a advertir")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName("razon")
            .setDescription("La razón de la advertencia")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("numero")
            .setDescription("Número de advertencias a añadir (por defecto: 1)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("quitar")
        .setDescription("Eliminar la advertencia más reciente de un usuario")
        .addStringOption((option) =>
          option
            .setName("nombre")
            .setDescription("El nombre del usuario")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("limpiar")
        .setDescription("Eliminar todas las advertencias de un usuario")
        .addStringOption((option) =>
          option
            .setName("nombre")
            .setDescription("El nombre del usuario")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("listar")
        .setDescription("Listar todos los usuarios con advertencias")
        .addBooleanOption((option) =>
          option
            .setName("persistente")
            .setDescription(
              "Crear una lista persistente que se actualiza automáticamente"
            )
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("resetear_lista")
        .setDescription("Eliminar la lista persistente actual")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("permaban")
        .setDescription("Permabanea al usuario. (Ignora advertencias).")
        .addStringOption((option) =>
          option
            .setName("nombre")
            .setDescription("El nombre del usuario")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName("razón")
            .setDescription("La razón del permaban.")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case "revisar":
          return await handleRevisar(interaction);
        case "agregar":
          return await handleAgregar(interaction);
        case "quitar":
          return await handleQuitar(interaction);
        case "limpiar":
          return await handleLimpiar(interaction);
        case "listar":
          return await handleListar(interaction);
        case "resetear_lista":
          return await handleResetearLista(interaction);
        case "permaban":
          return await handlePermaban(interaction);
        default:
          return await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("Error")
                .setDescription("Subcomando desconocido.")
                .setColor(0xff0000),
            ],
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error("Command execution error:", error);

      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("Error")
                .setDescription("Ocurrió un error al ejecutar este comando.")
                .setColor(0xff0000),
            ],
            ephemeral: true,
          });
        } catch (replyError) {
          console.error("Could not send error response:", replyError);
        }
      } else if (interaction.deferred && !interaction.replied) {
        try {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle("Error")
                .setDescription("Ocurrió un error al ejecutar este comando.")
                .setColor(0xff0000),
            ],
          });
        } catch (editError) {
          console.error("Could not edit reply with error:", editError);
        }
      }
    }
  },
};

async function handleRevisar(interaction) {
  const nombre = interaction.options.getString("nombre");
  const user = findUser(nombre);

  if (!user) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Advertencias no encontradas")
          .setDescription(
            `No se encontraron advertencias para el usuario: ${nombre}`
          )
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`Advertencias para ${user.name}`)
    .setColor(user.banned ? 0xff0000 : 0xffa500)
    .setDescription(
      `Advertencias totales: ${user.warnings}/${warningsForBan(user.banCount)}`
    )
    .setFooter({
      text: user.banned
        ? `Este usuario está baneado | Bans totales: ${user.banCount}`
        : `${
            warningsForBan(user.banCount) - user.warnings
          } advertencias restantes para el ban | Bans totales: ${
            user.banCount
          }`,
    })
    .setTimestamp();

  if (user.reasons.length > 0) {
    embed.addFields(
      user.reasons.slice(0, 25).map((warn, index) => {
        const date = new Date(warn.date).toLocaleDateString();
        return {
          name: `Advertencia #${index + 1} (${date})`,
          value: `Razón: ${warn.reason}\nEmitida por: ${warn.issuedBy}`,
        };
      })
    );
  }

  if (user.reasons.length > 25) {
    embed.addFields({
      name: "Nota",
      value: `Mostrando 25/${user.reasons.length} advertencias debido a limitaciones de Discord.`,
    });
  }

  return interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

async function handleAgregar(interaction) {
  if (!hasModeratorRole(interaction.member)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Permiso denegado")
          .setDescription("No tienes permiso para usar este comando.")
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }

  const nombre = interaction.options.getString("nombre");
  const razon = interaction.options.getString("razon");
  const numero = interaction.options.getInteger("numero") || 1;
  const truncatedReason =
    razon.length > 900 ? razon.substring(0, 897) + "..." : razon;
  const issuedBy = interaction.user.username;

  let user;
  for (let i = 0; i < numero; i++) {
    user = addWarning(nombre, truncatedReason, issuedBy);
  }

  const banState = user.banned
    ? `Este usuario está baneado | Bans totales: ${user.banCount}`
    : `${
        warningsForBan(user.banCount) - user.warnings
      } advertencias restantes para el ban | Bans totales: ${user.banCount}`;

  const embed = new EmbedBuilder()
    .setTitle(`${numero} Advertencia${numero > 1 ? "s" : ""} para ${nombre}`)
    .setColor(user.banned ? 0xff0000 : 0x0099ff)
    .setDescription(`**Razón:** ${truncatedReason}`)
    .addFields({
      name: "Detalles",
      value: `Advertencias añadidas: ${numero}`,
    })
    .setFooter({ text: `${banState}\nAdvertencia emitida por: ${issuedBy}` })
    .setTimestamp();

  const channel = interaction.client.channels.cache.get(config.warningsChannel);
  if (channel) {
    await channel.send({ embeds: [embed] });
  } else {
    console.error("No se encontró el canal de advertencias.");
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("Advertencia Registrada.")
        .setDescription(`Se han agregado ${numero} advertencia(s) a ${nombre}.`)
        .setColor(0xffa500),
    ],
    ephemeral: true,
  });

  await updatePersistentList(interaction.client);
}

async function handleQuitar(interaction) {
  if (!hasModeratorRole(interaction.member)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Permiso denegado")
          .setDescription("No tienes permiso para usar este comando.")
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }

  const nombre = interaction.options.getString("nombre");

  const existingUser = findUser(nombre);
  if (!existingUser) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Usuario no encontrado")
          .setDescription(
            `No se encontraron advertencias para el usuario: ${nombre}`
          )
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }

  if (existingUser.warnings === 0) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Sin advertencias")
          .setDescription(`${nombre} no tiene advertencias para eliminar.`)
          .setColor(0xffa500),
      ],
      ephemeral: true,
    });
  }

  const user = removeWarning(nombre);

  const embed = new EmbedBuilder()
    .setTitle(`Advertencia eliminada de ${nombre}`)
    .setColor(0x00ff00)
    .setDescription(
      existingUser.banned && !user.banned
        ? `Advertencias actuales: ${user.warnings}/${warningsForBan(
            user.banCount
          )}\n**El usuario ya no está baneado**`
        : `Advertencias actuales: ${user.warnings}/${warningsForBan(
            user.banCount
          )}`
    )
    .setTimestamp();

  const channel = interaction.client.channels.cache.get(config.warningsChannel);
  if (channel) {
    await channel.send({ embeds: [embed] });
  } else {
    console.error("No se encontró el canal de advertencias.");
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("Advertencia Eliminada.")
        .setDescription(`Se ha borrado la última advertencia de ${nombre}.`)
        .setColor(0xffa500),
    ],
    ephemeral: true,
  });

  await updatePersistentList(interaction.client);
}

async function handleLimpiar(interaction) {
  if (!hasModeratorRole(interaction.member)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Permiso denegado")
          .setDescription("No tienes permiso para usar este comando.")
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }

  const nombre = interaction.options.getString("nombre");

  const existingUser = findUser(nombre);
  if (!existingUser) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Usuario no encontrado")
          .setDescription(
            `No se encontraron advertencias para el usuario: ${nombre}`
          )
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }

  const wasBanned = existingUser.banned;
  const user = clearWarnings(nombre);

  const embed = new EmbedBuilder()
    .setTitle(`Advertencias eliminadas de ${nombre}`)
    .setColor(0x00ff00)
    .setDescription(
      wasBanned
        ? "**El usuario ya no está baneado**"
        : "Todas las advertencias han sido eliminadas."
    )
    .setTimestamp();

  const channel = interaction.client.channels.cache.get(config.warningsChannel);
  if (channel) {
    await channel.send({ embeds: [embed] });
  } else {
    console.error("No se encontró el canal de advertencias.");
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("Advertencia Limpada..")
        .setDescription(`Se han limpiado las advertencias a ${nombre}.`)
        .setColor(0xffa500),
    ],
    ephemeral: true,
  });

  await updatePersistentList(interaction.client);
}

async function handlePermaban(interaction) {
  if (!hasModeratorRole(interaction.member)) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Permiso denegado")
          .setDescription("No tienes permiso para usar este comando.")
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  }

  const nombre = interaction.options.getString("nombre");
  const razon =
    interaction.options.getString("razón") || "No se especificó una razón";
  const issuedBy = interaction.user.username;

  let user = permabanUser(nombre, razon, issuedBy);

  const embed = new EmbedBuilder()
    .setTitle(`Usuario Permabaneado: ${nombre}`)
    .setColor(0xff0000)
    .setDescription(`**Razón:** ${razon}`)
    .addFields({
      name: "Estado",
      value:
        "Este usuario ha sido permanentemente baneado y no podrá ser desbaneado con el comando normal.",
    })
    .setFooter({ text: `Permaban emitido por: ${issuedBy}` })
    .setTimestamp();

  try {
    const channel = interaction.client.channels.cache.get(
      config.warningsChannel
    );
    if (channel) {
      await channel.send({ embeds: [embed] });
    } else {
      console.error("No se encontró el canal de advertencias.");
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Usuario Permabaneado.")
          .setDescription(`Se ha permabaneado a ${nombre}.`)
          .setColor(0xffa500),
      ],
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error responding to interaction:", error);
  }

  try {
    await updatePersistentList(interaction.client);
  } catch (error) {
    console.error("Error updating persistent list:", error);
  }
}
