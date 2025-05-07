import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import config from "../config.js";

export default {
  data: new SlashCommandBuilder()
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .setName("apagar")
    .setDescription("Comando para apagar el bot. NO USAR."),

  async execute(interaction) {
    const member = interaction.member;
    const isAdmin = member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    // using this instead of helper so only FIA can turn off (I do not trust MAESTRO SPLINTER.)
    if (!isAdmin) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Permiso denegado")
            .setDescription("SOS una MALA persona.")
            .setColor(0xff0000),
        ],
        ephemeral: true,
      });
    }

    const channel = interaction.client.channels.cache.get(
      config.warningsChannel
    );
    await channel.send("🤖 BOT APAGADO 📴");
    await interaction.reply({ content: "mmmm patas", ephemeral: true });

    process.exit(0);
  },
};
