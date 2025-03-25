// import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
// import { readQCount } from "../scripts/qCount.js"; // Ensure correct file extension

export default {};

// export default {
//   data: new SlashCommandBuilder()
//     .setName("q")
//     .setDescription("Ranking de personas que más han COLABORADO al canal Q."),

//   async execute(interaction) {
//     try {
//       let usersMap = readQCount().users;

//       if (!usersMap || Object.keys(usersMap).length === 0) {
//         return await interaction.reply({
//           content: "Aún no hay registros en el ranking de Q.",
//           ephemeral: true,
//         });
//       }

//       let ranking = Object.entries(usersMap)
//         .sort(([, a], [, b]) => b - a)
//         .map(
//           ([userId, count], index) =>
//             `**#${index + 1}** - <@${userId}> → **${count}** Qs`
//         )
//         .join("\n");

//       const embed = new EmbedBuilder()
//         .setTitle("Ranking de Qs")
//         .setDescription(ranking)
//         .setColor("Gold")
//         .setThumbnail(
//           "https://cdn.discordapp.com/emojis/1067169895836669952.png"
//         )
//         .setFooter({
//           text: "¡Sigue participando para subir en el ranking!",
//           iconURL: interaction.client.user.displayAvatarURL(),
//         });

//       await interaction.reply({ embeds: [embed] });
//     } catch (error) {
//       console.error("Error al ejecutar el comando /q:", error);
//       await interaction.reply({
//         content: "Hubo un error al obtener el ranking de Qs.",
//         ephemeral: true,
//       });
//     }
//   },
// };
