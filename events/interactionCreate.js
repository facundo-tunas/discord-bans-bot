import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  time,
} from "discord.js";
import { handleAutocomplete } from "../scripts/handleAutocomplete.js";
import { createWarningListEmbed } from "../scripts/listar.js";
import { getAllUsers } from "../utils/dataHandler.js";
import {
  getActiveListMessage,
  saveActiveListMessage,
} from "../utils/persistentList.js";

export default {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction);
    }

    if (interaction.isButton()) {
      if (interaction.customId === "refresh_list") {
        await handleRefreshList(interaction);
      }
    }

    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`);
      console.error(error);

      const errorMessage = {
        content: "There was an error executing this command!",
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};

async function handleRefreshList(interaction) {
  try {
    const listInfo = getActiveListMessage();
    if (!listInfo || listInfo.messageId !== interaction.message.id) {
      return interaction
        .reply({
          content: "Este botón ya no está asociado a una lista activa.",
          ephemeral: true,
        })
        .catch(console.error);
    }

    // Defer the response to avoid timeout
    await interaction.deferUpdate().catch(console.error);

    const users = await getAllUsers();
    const needsPagination = users.length > 20;
    const { embed, totalPages } = await createWarningListEmbed(
      users,
      true,
      1,
      needsPagination
    );

    let components = [];

    // Add pagination row if needed
    if (needsPagination) {
      const paginationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev_page")
          .setLabel("◀️ Anterior")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true), // Disabled because we're on page 1
        new ButtonBuilder()
          .setCustomId("next_page")
          .setLabel("Siguiente ▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(totalPages <= 1)
      );

      components.push(paginationRow);
    }

    const refreshRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("refresh_list")
        .setLabel("🔄 Actualizar")
        .setStyle(ButtonStyle.Success)
    );

    components.push(refreshRow);

    const updatedMessage = await interaction
      .editReply({
        embeds: [embed],
        components: components,
      })
      .catch(async (error) => {
        console.error("Error updating list:", error);
        if (error.code === 10062) {
          return null;
        }
      });

    if (updatedMessage && needsPagination) {
      const collector = updatedMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.customId === "prev_page" || i.customId === "next_page",
        time: 300000,
      });

      let currentPage = 1;

      collector.on("collect", async (i) => {
        try {
          if (i.customId === "prev_page") {
            currentPage = Math.max(1, currentPage - 1);
          } else if (i.customId === "next_page") {
            currentPage = Math.min(totalPages, currentPage + 1);
          }

          const { embed: newEmbed } = await createWarningListEmbed(
            users,
            true,
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

          const refreshRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("refresh_list")
              .setLabel("🔄 Actualizar")
              .setStyle(ButtonStyle.Success)
          );

          components.push(refreshRow);

          await i
            .update({
              embeds: [newEmbed],
              components: components,
            })
            .catch(async (error) => {
              if (error.code === 10062) {
                await i
                  .reply({
                    content:
                      "⚠️ Esta interacción ya expiró. Haz clic en 🔄 Actualizar para obtener una nueva lista.",
                    ephemeral: true,
                  })
                  .catch(() => {});
              } else {
                console.error("Error updating pagination:", error);
              }
            });
        } catch (error) {
          console.error("Error in collector:", error);
        }
      });

      collector.on("end", () => {
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

          const refreshRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("refresh_list")
              .setLabel("🔄 Actualizar")
              .setStyle(ButtonStyle.Success)
          );

          components.push(refreshRow);

          updatedMessage.edit({ components: components }).catch(console.error);
        } catch (error) {
          console.error("Error updating buttons after timeout:", error);
        }
      });
    }

    if (!updatedMessage) {
      try {
        const channel = await interaction.client.channels.fetch(
          listInfo.channelId
        );
        const newMessage = await channel.send({
          content:
            "La interacción anterior expiró. Aquí hay una nueva lista actualizada:",
          embeds: [embed],
          components: components,
        });

        saveActiveListMessage(newMessage.id, channel.id, channel.guildId);

        if (needsPagination) {
          const collector = newMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i) =>
              i.customId === "prev_page" || i.customId === "next_page",
            time: 300000,
          });

          let currentPage = 1;

          collector.on("collect", async (i) => {
            console.log("xd");
            try {
              if (i.customId === "prev_page") {
                currentPage = Math.max(1, currentPage - 1);
              } else if (i.customId === "next_page") {
                currentPage = Math.min(totalPages, currentPage + 1);
              }

              const { embed: newEmbed } = await createWarningListEmbed(
                users,
                true,
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

              const refreshRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId("refresh_list")
                  .setLabel("🔄 Actualizar")
                  .setStyle(ButtonStyle.Success)
              );

              components.push(refreshRow);

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
            console.log("Xd");
            try {
              const components = [];

              const disabledPaginationRow =
                new ActionRowBuilder().addComponents(
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

              const refreshRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId("refresh_list")
                  .setLabel("🔄 Actualizar")
                  .setStyle(ButtonStyle.Success)
              );

              components.push(refreshRow);

              newMessage.edit({ components: components }).catch(console.error);
            } catch (error) {
              console.error("Error updating buttons after timeout:", error);
            }
          });
        }
      } catch (channelError) {
        console.error("Failed to send new message:", channelError);
      }
    }
  } catch (error) {
    console.error("Error refreshing warnings list:", error);
    try {
      await interaction
        .followUp({
          content:
            "Hubo un error al actualizar la lista. Por favor, inténtalo de nuevo.",
          ephemeral: true,
        })
        .catch(console.error);
    } catch (replyError) {
      console.error("Error replying to interaction:", replyError);
    }
  }
}
