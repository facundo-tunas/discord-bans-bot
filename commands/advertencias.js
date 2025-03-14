import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import {
  findUser,
  getAllUsers,
  addWarning,
  removeWarning,
  clearWarnings,
} from "../utils/dataHandler.js";
import { hasModeratorRole } from "../utils/hasPermissions.js";

export default {
  data: new SlashCommandBuilder()
    .setName("advertencias")
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
        )
        .addStringOption((option) =>
          option
            .setName("razon")
            .setDescription("La razón de la advertencia")
            .setRequired(true)
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
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("listar")
        .setDescription("Listar todos los usuarios con advertencias")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "revisar":
        return handleRevisar(interaction);
      case "agregar":
        return handleAgregar(interaction);
      case "quitar":
        return handleQuitar(interaction);
      case "limpiar":
        return handleLimpiar(interaction);
      case "listar":
        return handleListar(interaction);
      default:
        return interaction.reply({
          content: "Subcomando desconocido.",
          ephemeral: true,
        });
    }
  },
};

async function handleRevisar(interaction) {
  const nombre = interaction.options.getString("nombre");
  const user = findUser(nombre);

  if (!user) {
    return interaction.reply({
      content: `No se encontraron advertencias para el usuario: ${nombre}`,
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`Advertencias para ${user.name}`)
    .setColor(user.banned ? 0xff0000 : 0xffa500)
    .setDescription(`Advertencias totales: ${user.warnings}/5`)
    .setFooter({
      text: user.banned
        ? `⚠️ ESTE USUARIO ESTÁ BANEADO ⚠️ | Bans totales: ${user.banCount}`
        : `${
            5 - user.warnings
          } advertencias restantes para el ban | Bans totales: ${
            user.banCount
          }`,
    })
    .setTimestamp();

  if (user.reasons.length > 0) {
    embed.addFields(
      user.reasons.map((warn, index) => {
        const date = new Date(warn.date).toLocaleDateString();
        return {
          name: `Advertencia #${index + 1} (${date})`,
          value: `Razón: ${warn.reason}\nEmitida por: ${warn.issuedBy}`,
        };
      })
    );
  }

  return interaction.reply({
    embeds: [embed],
    ephemeral: false,
  });
}

async function handleAgregar(interaction) {
  if (!hasModeratorRole(interaction.member)) {
    return interaction.reply({
      content: "No tienes permiso para usar este comando.",
      ephemeral: true,
    });
  }

  const nombre = interaction.options.getString("nombre");
  const razon = interaction.options.getString("razon");
  const issuedBy = interaction.user.username;

  const user = addWarning(nombre, razon, issuedBy);

  const embed = new EmbedBuilder()
    .setTitle(`️ ${nombre} ha recibido una advertencia por: ${razon}`)
    .setColor(user.banned ? "Red" : "Blue")
    .setFooter({ text: `Por ${issuedBy}` })
    .setTimestamp();

  embed.setDescription(
    user.banned
      ? `⚠️ ESTE USUARIO ESTÁ BANEADO ⚠️ | Bans totales: ${user.banCount}`
      : `${
          5 - user.warnings
        } advertencias restantes para el ban | Bans totales: ${user.banCount}`
  );

  return interaction.reply({ embeds: [embed] }); // Fixed
}

async function handleQuitar(interaction) {
  if (!hasModeratorRole(interaction.member)) {
    return interaction.reply({
      content: "No tienes permiso para usar este comando.",
      ephemeral: true,
    });
  }

  const nombre = interaction.options.getString("nombre");

  const existingUser = findUser(nombre);
  if (!existingUser) {
    return interaction.reply({
      content: `No se encontraron advertencias para el usuario: ${nombre}`,
      ephemeral: true,
    });
  }

  if (existingUser.warnings === 0) {
    return interaction.reply({
      content: `${nombre} no tiene advertencias para eliminar.`,
      ephemeral: true,
    });
  }

  const user = removeWarning(nombre);

  if (existingUser.banned && !user.banned) {
    return interaction.reply({
      content: `✅ Se eliminó una advertencia de ${nombre}.\nAdvertencias actuales: ${user.warnings}/5\n**El usuario ya no está baneado**`,
      ephemeral: false,
    });
  } else {
    return interaction.reply({
      content: `✅ Se eliminó una advertencia de ${nombre}.\nAdvertencias actuales: ${user.warnings}/5`,
      ephemeral: false,
    });
  }
}

async function handleLimpiar(interaction) {
  if (!hasModeratorRole(interaction.member)) {
    return interaction.reply({
      content: "No tienes permiso para usar este comando.",
      ephemeral: true,
    });
  }

  const nombre = interaction.options.getString("nombre");

  const existingUser = findUser(nombre);
  if (!existingUser) {
    return interaction.reply({
      content: `No se encontraron advertencias para el usuario: ${nombre}`,
      ephemeral: true,
    });
  }

  const wasBanned = existingUser.banned;
  const user = clearWarnings(nombre);

  if (wasBanned) {
    return interaction.reply({
      content: `✅ Se eliminaron todas las advertencias para ${nombre}.\n**El usuario ya no está baneado**`,
      ephemeral: false,
    });
  } else {
    return interaction.reply({
      content: `✅ Se eliminaron todas las advertencias para ${nombre}.`,
      ephemeral: false,
    });
  }
}

async function handleListar(interaction) {
  const users = getAllUsers();

  if (users.length === 0) {
    return interaction.reply({
      content: "No hay usuarios con advertencias.",
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle("Usuarios con Advertencias")
    .setColor(0x0099ff)
    .setTimestamp();

  const sortedUsers = [...users].sort((a, b) => b.warnings - a.warnings);

  const bannedUsers = sortedUsers.filter((user) => user.banned);
  const warnedUsers = sortedUsers.filter(
    (user) => !user.banned && user.warnings > 0
  );

  if (bannedUsers.length > 0) {
    embed.addFields({
      name: "🚫 Usuarios Baneados",
      value:
        bannedUsers
          .map((user) => `**${user.name}** - ${user.warnings} advertencias`)
          .join("\n") || "Ninguno",
    });
  }

  if (warnedUsers.length > 0) {
    embed.addFields({
      name: "⚠️ Usuarios Advertidos",
      value:
        warnedUsers
          .map((user) => `**${user.name}** - ${user.warnings}/5 advertencias`)
          .join("\n") || "Ninguno",
    });
  }

  return interaction.reply({
    embeds: [embed],
    ephemeral: false,
  });
}
