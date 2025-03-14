import { EmbedBuilder } from "discord.js";
import config from "../config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const countFilePath = path.join(__dirname, "../data/q.json");

function readQCount() {
  try {
    if (!fs.existsSync(countFilePath)) {
      const dirPath = path.dirname(countFilePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(countFilePath, JSON.stringify({ count: 0 }), "utf8");
      return 0;
    }

    const data = fs.readFileSync(countFilePath, "utf8");
    const countData = JSON.parse(data);
    return countData.count || 0;
  } catch (error) {
    console.error("Error reading Q count:", error);
    return 0;
  }
}

function updateQCount(count) {
  try {
    fs.writeFileSync(countFilePath, JSON.stringify({ count }), "utf8");
  } catch (error) {
    console.error("Error updating Q count:", error);
  }
}
let qCount = readQCount();

export default {
  name: "messageCreate",
  execute(message, client) {
    if (message.author.bot) return;

    if (message.channel.id === config.qchannel) {
      if (message.content.toLowerCase() === "q") {
        qCount++;
        updateQCount(qCount);

        let embed = new EmbedBuilder()
          .setTitle(`Q número **${qCount}**.`)
          .setColor("Green");

        message
          .reply({ embeds: [embed] })
          .catch((error) =>
            console.error("Failed to reply with q count:", error)
          );
        message
          .react("☑️")
          .catch((error) =>
            console.error("Failed to react with check mark:", error)
          );
      }
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
    }
  },
};
