import { EmbedBuilder } from "discord.js";
import config from "../config.js";
import { readQCount, updateQCount } from "../scripts/qCount.js";

export default {
  name: "messageCreate",
  execute(message, client) {
    if (message.author.bot) return;

    // if (message.channel.id === config.qchannel) {
    //   if (message.content.toLowerCase() === "q") {
    //     updateQCount(message.author.id);
    //     let qCount = readQCount().count;

    //     let embed = new EmbedBuilder()
    //       .setTitle(`Q número **${qCount}**.`)
    //       .setColor("Green");

    //     message
    //       .reply({ embeds: [embed] })
    //       .catch((error) =>
    //         console.error("Failed to reply with q count:", error)
    //       );
    //     message
    //       .react("☑️")
    //       .catch((error) =>
    //         console.error("Failed to react with check mark:", error)
    //       );
    //   }
    // else {
    //   qCount = 0;
    //   updateQCount(0);

    //   let embed = new EmbedBuilder()
    //     .setTitle(`Se ha perdido la racha de Q.`)
    //     .setFooter({
    //       text: `Gracias al mogolico de ${message.author.username}.`,
    //     })
    //     .setColor("Red");

    //   message
    //     .reply({ embeds: [embed] })
    //     .catch((error) => console.error("Failed to reply.", error));

    //   message
    //     .react("❌")
    //     .catch((error) =>
    //       console.error("Failed to react with X mark:", error)
    //     );
    // }
    // }
  },
};
