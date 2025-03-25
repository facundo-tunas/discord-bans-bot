// import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

export default {};

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

// export default {
//   data: new SlashCommandBuilder()
//     .setName("reglas")
//     .setDescription("Muestra una regla aleatoria del canal."),

//   async execute(interaction) {
//     try {
//       const rulesPath = path.join(__dirname, "../data/rules.json");

//       if (!fs.existsSync(rulesPath)) {
//         return await interaction.reply({
//           content: "El archivo de reglas no existe.",
//           ephemeral: true,
//         });
//       }

//       const rulesData = JSON.parse(fs.readFileSync(rulesPath, "utf8"));

//       if (!rulesData.rules || rulesData.rules.length === 0) {
//         return await interaction.reply({
//           content: "No hay reglas definidas en el archivo.",
//           ephemeral: true,
//         });
//       }

//       const randomRule =
//         rulesData.rules[Math.floor(Math.random() * rulesData.rules.length)];

//       const embed = new EmbedBuilder()
//         .setTitle("Regla del Canal")
//         .setDescription(randomRule.text)
//         .setColor("Blue")
//         .setFooter({
//           text: `Regla #${randomRule.id || "N/A"}`,
//           iconURL: interaction.client.user.displayAvatarURL(),
//         });

//       if (randomRule.imageUrl) {
//         embed.setThumbnail(randomRule.imageUrl);
//       }

//       await interaction.reply({ embeds: [embed] });
//     } catch (error) {
//       console.error("Error al ejecutar el comando /rules:", error);
//       await interaction.reply({
//         content: "Hubo un error al obtener una regla aleatoria.",
//         ephemeral: true,
//       });
//     }
//   },
// };
