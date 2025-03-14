import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from "discord.js";
import { getAllUsers } from "../utils/dataHandler.js";
import {
  clearActiveListMessage,
  getActiveListMessage,
  saveActiveListMessage,
} from "../utils/persistentList.js";
import { hasModeratorRole } from "../utils/hasPermissions.js";

export async function handleListar(interaction) {
  const isPersistent = interaction.options.getBoolean("persistente") || false;
  const requestedPage = interaction.options.getInteger("pagina") || 1;
  const users = await getAllUsers();

  const needsPagination = users.length > 20;

  const { embed, totalPages } = await createWarningListEmbed(
    users,
    isPersistent,
    requestedPage,
    needsPagination
  );

  const existingList = getActiveListMessage();
  if (isPersistent && existingList) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Lista persistente ya existe")
          .setDescription(
            "Ya existe una lista persistente activa. Usa `/adv resetear_lista` para eliminarla antes de crear una nueva."
          )
          .setColor(0xffa500),
      ],
      ephemeral: true,
    });
  }

  //  pagination buttons
  let components = [];
  if (needsPagination && !isPersistent) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev_page")
        .setLabel("◀️ Anterior")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(requestedPage <= 1),
      new ButtonBuilder()
        .setCustomId("next_page")
        .setLabel("Siguiente ▶️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(requestedPage >= totalPages)
    );
    components = [row];
  }

  if (isPersistent) {
    const reply = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
      ephemeral: false,
      // Note: We don't add components to persistent lists as they would timeout
    });

    saveActiveListMessage(reply.id, interaction.channelId, interaction.guildId);

    await interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setTitle("Lista persistente creada")
          .setDescription(
            "Se ha creado una lista de advertencias que se actualizará automáticamente cuando cambie el estado de las advertencias."
          )
          .setColor(0x00ff00),
      ],
      ephemeral: true,
    });
  } else {
    const message = await interaction.reply({
      embeds: [embed],
      components: components,
      ephemeral: false,
      fetchReply: true,
    });

    if (needsPagination) {
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000, // 5 minutes timeout
      });

      let currentPage = requestedPage;

      collector.on("collect", async (i) => {
        if (i.customId === "prev_page") {
          currentPage = Math.max(1, currentPage - 1);
        } else if (i.customId === "next_page") {
          currentPage = Math.min(totalPages, currentPage + 1);
        }

        const { embed: newEmbed } = await createWarningListEmbed(
          users,
          false,
          currentPage,
          true
        );

        const updatedRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev_page")
            .setLabel("◀️ Anterior")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage <= 1),
          new ButtonBuilder()
            .setCustomId("next_page")
            .setLabel("Siguiente ▶️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages)
        );

        await i.update({
          embeds: [newEmbed],
          components: [updatedRow],
        });
      });

      collector.on("end", () => {
        try {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("prev_page")
              .setLabel("◀️ Anterior")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId("next_page")
              .setLabel("Siguiente ▶️")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );

          message.edit({ components: [disabledRow] }).catch(console.error);
        } catch (error) {
          console.error("Error updating buttons after timeout:", error);
        }
      });
    }
  }
}

export async function handleResetearLista(interaction) {
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

  const existingList = getActiveListMessage();
  if (!existingList) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Sin lista activa")
          .setDescription(
            "No hay ninguna lista persistente activa para resetear."
          )
          .setColor(0xffa500),
      ],
      ephemeral: true,
    });
  }

  clearActiveListMessage();

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("Lista eliminada")
        .setDescription(
          "La lista persistente ha sido eliminada. Puedes crear una nueva con `/adv listar persistente:true`"
        )
        .setColor(0x00ff00),
    ],
    ephemeral: true,
  });
}

async function createWarningListEmbed(
  users,
  persistent,
  page = 1,
  paginate = false
) {
  if (users.length === 0) {
    return {
      embed: new EmbedBuilder()
        .setTitle("Sin advertencias")
        .setDescription("No hay usuarios con advertencias.")
        .setColor("Green")
        .setTimestamp(),
      totalPages: 1,
    };
  }

  const embed = new EmbedBuilder()
    .setTitle("Usuarios con Advertencias")
    .setColor("Red")
    .setTimestamp();

  const sortedUsers = [...users].sort((a, b) => b.warnings - a.warnings);

  const bannedUsers = sortedUsers.filter((user) => user.banned);
  const warnedUsers = sortedUsers.filter(
    (user) => !user.banned && user.warnings > 0
  );

  if (paginate) {
    const usersPerPage = 20;
    const totalUsers = bannedUsers.length + warnedUsers.length;
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    const validPage = Math.max(1, Math.min(page, totalPages));

    const startIndex = (validPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;

    let usersToShow = [];

    usersToShow = [...bannedUsers, ...warnedUsers].slice(startIndex, endIndex);

    const paginatedBannedUsers = usersToShow.filter((user) => user.banned);
    const paginatedWarnedUsers = usersToShow.filter((user) => !user.banned);

    if (paginatedBannedUsers.length > 0) {
      embed.addFields({
        name: "🚨 Usuarios Baneados",
        value:
          paginatedBannedUsers
            .map((user) => `**${user.name}** - ${user.warnings} advertencias`)
            .join("\n")
            .substring(0, 1020) || "Ninguno",
      });
    }

    if (paginatedWarnedUsers.length > 0) {
      embed.addFields({
        name: "⚠️ Usuarios Advertidos",
        value:
          paginatedWarnedUsers
            .map((user) => `**${user.name}** - ${user.warnings}/5 advertencias`)
            .join("\n")
            .substring(0, 1020) || "Ninguno",
      });
    }

    embed.setFooter({
      text: `Página ${validPage}/${totalPages} | ${
        persistent ? "Lista persistente - Se actualiza automáticamente" : ""
      }`,
    });

    return { embed, totalPages };
  } else {
    const maxUsersPerField = 20;

    if (bannedUsers.length > 0) {
      for (let i = 0; i < bannedUsers.length; i += maxUsersPerField) {
        const batchBannedUsers = bannedUsers.slice(i, i + maxUsersPerField);

        embed.addFields({
          name:
            i === 0 ? "🚨 Usuarios Baneados" : "🚨 Usuarios Baneados (cont.)",
          value:
            batchBannedUsers
              .map((user) => `**${user.name}** - ${user.warnings} advertencias`)
              .join("\n")
              .substring(0, 1020) || "Ninguno",
        });
      }
    }

    if (warnedUsers.length > 0) {
      for (let i = 0; i < warnedUsers.length; i += maxUsersPerField) {
        const batchWarnedUsers = warnedUsers.slice(i, i + maxUsersPerField);

        embed.addFields({
          name:
            i === 0
              ? "⚠️ Usuarios Advertidos"
              : "⚠️ Usuarios Advertidos (cont.)",
          value:
            batchWarnedUsers
              .map(
                (user) => `**${user.name}** - ${user.warnings}/5 advertencias`
              )
              .join("\n")
              .substring(0, 1020) || "Ninguno",
        });
      }
    }

    if (bannedUsers.length + warnedUsers.length > 50) {
      embed.setDescription(
        "Hay muchos usuarios con advertencias. Usa `/adv listar pagina:X` para ver la lista paginada."
      );
    }

    if (persistent) {
      embed.setFooter({
        text: "Lista persistente - Se actualiza automáticamente",
      });
    }
    return { embed, totalPages: 1 };
  }
}

export async function updatePersistentList(client) {
  const listInfo = await getActiveListMessage();
  if (!listInfo) return;

  try {
    let channel = null;

    if (typeof listInfo === "object" && listInfo.channelId) {
      try {
        channel = await client.channels.fetch(listInfo.channelId);
      } catch (err) {
        console.error(
          `Failed to fetch channel ${listInfo.channelId}:`,
          err.message
        );
        return;
      }
    } else {
      console.error("Invalid list info format or missing channelId:", listInfo);
      return;
    }

    if (!channel || !channel.isTextBased()) {
      console.error(
        `Channel not found or not a text channel: ${listInfo.channelId}`
      );
      return;
    }

    let targetMessage = null;
    try {
      targetMessage = await channel.messages.fetch(listInfo.messageId);
    } catch (err) {
      console.error(
        `Failed to fetch message ${listInfo.messageId}:`,
        err.message
      );
      clearActiveListMessage();
      return;
    }

    if (!targetMessage) {
      console.error(`Message not found: ${listInfo.messageId}`);
      clearActiveListMessage();
      return;
    }

    const users = await getAllUsers();
    const { embed: updatedEmbed } = await createWarningListEmbed(
      users,
      true,
      1,
      users.length > 20
    );

    await targetMessage.edit({ embeds: [updatedEmbed] });
    console.log("Successfully updated warnings list");
  } catch (error) {
    console.error("Error updating persistent warnings list:", error);
  }
}
