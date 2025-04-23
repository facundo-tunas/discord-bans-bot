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
import { warningsForBan } from "../utils/warningsUntilBan.js";

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

  let components = [];

  if (isPersistent) {
    if (needsPagination) {
      const paginationRow = new ActionRowBuilder().addComponents(
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

      const refreshRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("refresh_list")
          .setLabel("🔄 Actualizar")
          .setStyle(ButtonStyle.Success)
      );

      components = [paginationRow, refreshRow];
    } else {
      const refreshRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("refresh_list")
          .setLabel("🔄 Actualizar")
          .setStyle(ButtonStyle.Success)
      );

      components = [refreshRow];
    }
  } else if (needsPagination) {
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

  const message = await interaction.reply({
    embeds: [embed],
    components: components,
    ephemeral: false,
    fetchReply: true,
  });

  if (needsPagination) {
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.customId === "prev_page" || i.customId === "next_page",
      time: 300000,
    });

    let currentPage = requestedPage;

    collector.on("collect", async (i) => {
      try {
        if (i.customId === "prev_page") {
          currentPage = Math.max(1, currentPage - 1);
        } else if (i.customId === "next_page") {
          currentPage = Math.min(totalPages, currentPage + 1);
        }

        const { embed: newEmbed } = await createWarningListEmbed(
          users,
          isPersistent,
          currentPage,
          true
        );

        let components = [];

        const paginationRow = new ActionRowBuilder().addComponents(
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

        components.push(paginationRow);

        if (isPersistent) {
          const refreshRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("refresh_list")
              .setLabel("🔄 Actualizar")
              .setStyle(ButtonStyle.Success)
          );

          components.push(refreshRow);
        }

        await i
          .update({
            embeds: [newEmbed],
            components: components,
          })
          .catch((error) => {
            console.error("Error updating pagination:", error);
          });
      } catch (error) {
        console.error("Error in collector:", error);
      }
    });

    collector.on("end", () => {
      console.log("xd");
      try {
        const components = [];

        const disabledPaginationRow = new ActionRowBuilder().addComponents(
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

        components.push(disabledPaginationRow);

        if (isPersistent) {
          const refreshRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("refresh_list")
              .setLabel("🔄 Actualizar")
              .setStyle(ButtonStyle.Success)
          );

          components.push(refreshRow);
        }

        message.edit({ components: components }).catch(console.error);
      } catch (error) {
        console.error("Error updating buttons after timeout:", error);
      }
    });

    if (isPersistent) {
      saveActiveListMessage(
        message.id,
        interaction.channelId,
        interaction.guildId
      );

      await interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle("Lista persistente creada")
            .setDescription(
              "Se ha creado una lista de advertencias que se actualizará automáticamente cuando cambie el estado de las advertencias. Usa el botón de actualizar para refrescar la lista y los controles de paginación."
            )
            .setColor(0x00ff00),
        ],
        ephemeral: true,
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

export async function createWarningListEmbed(
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

  const permabannedUsers = sortedUsers.filter((user) => user.permaban === true);
  const bannedUsers = sortedUsers.filter(
    (user) => user.banned && !user.permaban
  );
  const warnedUsers = sortedUsers.filter(
    (user) => !user.banned && !user.permaban && user.warnings > 0
  );

  if (paginate) {
    const usersPerPage = 20;
    const totalUsers =
      permabannedUsers.length + bannedUsers.length + warnedUsers.length;
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    const validPage = Math.max(1, Math.min(page, totalPages));

    const startIndex = (validPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;

    let usersToShow = [
      ...permabannedUsers,
      ...bannedUsers,
      ...warnedUsers,
    ].slice(startIndex, endIndex);

    const paginatedPermabannedUsers = usersToShow.filter(
      (user) => user.permaban === true
    );
    const paginatedBannedUsers = usersToShow.filter(
      (user) => user.banned && !user.permaban
    );
    const paginatedWarnedUsers = usersToShow.filter(
      (user) => !user.banned && !user.permaban
    );

    if (paginatedPermabannedUsers.length > 0) {
      embed.addFields({
        name: "🔒 Usuarios Permabaneados",
        value:
          paginatedPermabannedUsers
            .map(
              (user) =>
                `**${user.name}** - ${
                  user.permabanReason || "Razón desconocida."
                }`
            )
            .join("\n")
            .substring(0, 1020) || "Ninguno",
      });
    }

    if (paginatedBannedUsers.length > 0) {
      embed.addFields({
        name: "🚨 Usuarios Baneados",
        value:
          paginatedBannedUsers
            .map(
              (user) =>
                `**${user.name}** - ${
                  user.warnings
                } advertencias | Baneado hasta: ${
                  user.banEndDate
                    ? `<t:${Math.floor(
                        new Date(user.banEndDate).getTime() / 1000
                      )}:f>`
                    : "Fecha desconocida"
                }`
            )
            .join("\n")
            .substring(0, 1020) || "Ninguno",
      });
    }

    if (paginatedWarnedUsers.length > 0) {
      embed.addFields({
        name: "⚠️ Usuarios Advertidos",
        value:
          paginatedWarnedUsers
            .map(
              (user) =>
                `**${user.name}** - ${user.warnings}/${warningsForBan(
                  user.banCount
                )} advertencias`
            )
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

    if (permabannedUsers.length > 0) {
      for (let i = 0; i < permabannedUsers.length; i += maxUsersPerField) {
        const batchPermabannedUsers = permabannedUsers.slice(
          i,
          i + maxUsersPerField
        );

        embed.addFields({
          name:
            i === 0
              ? "🔒 Usuarios Permabaneados"
              : "🔒 Usuarios Permabaneados (cont.)",
          value:
            batchPermabannedUsers
              .map((user) => `**${user.name}** - Ban permanente`)
              .join("\n")
              .substring(0, 1020) || "Ninguno",
        });
      }
    }

    if (bannedUsers.length > 0) {
      for (let i = 0; i < bannedUsers.length; i += maxUsersPerField) {
        const batchBannedUsers = bannedUsers.slice(i, i + maxUsersPerField);

        embed.addFields({
          name:
            i === 0 ? "🚨 Usuarios Baneados" : "🚨 Usuarios Baneados (cont.)",
          value:
            batchBannedUsers
              .map(
                (user) =>
                  `**${user.name}** - ${
                    user.warnings
                  } advertencias - Baneado hasta: ${
                    user.banEndDate
                      ? `<t:${Math.floor(
                          new Date(user.banEndDate).getTime() / 1000
                        )}:f>`
                      : "Fecha desconocida"
                  }`
              )
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
                (user) =>
                  `**${user.name}** - ${user.warnings}/${warningsForBan(
                    user.banCount
                  )} advertencias`
              )
              .join("\n")
              .substring(0, 1020) || "Ninguno",
        });
      }
    }

    if (
      permabannedUsers.length + bannedUsers.length + warnedUsers.length >
      50
    ) {
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

    await targetMessage.edit({
      embeds: [updatedEmbed],
    });
    console.log("Successfully updated warnings list");
  } catch (error) {
    console.error("Error updating persistent warnings list:", error);
  }
}
