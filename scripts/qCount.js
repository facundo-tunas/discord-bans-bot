import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const countFilePath = path.join(__dirname, "../data/q.json");

export function readQCount() {
  try {
    if (!fs.existsSync(countFilePath)) {
      const dirPath = path.dirname(countFilePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(
        countFilePath,
        JSON.stringify({ count: 0, users: {} }),
        "utf8"
      );
      return { count: 0, users: {} };
    }

    const data = fs.readFileSync(countFilePath, "utf8");
    const countData = JSON.parse(data);

    if (!countData.users) {
      countData.users = {};
    }

    return countData;
  } catch (error) {
    console.error("Error reading Q count:", error);
    return { count: 0, users: {} };
  }
}

export function updateQCount(author) {
  try {
    let newCount = readQCount();
    newCount.count++;

    if (!newCount.users[author]) {
      newCount.users[author] = 0;
    }
    newCount.users[author]++;

    fs.writeFileSync(countFilePath, JSON.stringify(newCount), "utf8");
  } catch (error) {
    console.error("Error updating Q count:", error);
  }
}
