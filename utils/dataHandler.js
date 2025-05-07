import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { warningsForBan } from "./warningsUntilBan.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.join(__dirname, "..", "data", "warnings.json");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(dataFilePath)) {
  fs.writeFileSync(dataFilePath, JSON.stringify({ users: [] }, null, 2));
}

export function loadData() {
  try {
    const data = fs.readFileSync(dataFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading data:", error);
    return { users: [] };
  }
}

export function saveData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving data:", error);
    return false;
  }
}

export function findUser(name) {
  const data = loadData();
  return data.users.find(
    (user) => user.name.toLowerCase() === name.toLowerCase()
  );
}

export function addWarning(name, reason, issuedBy) {
  const data = loadData();
  let user = data.users.find(
    (user) => user.name.toLowerCase() === name.toLowerCase()
  );

  if (!user) {
    user = {
      name,
      warnings: 0,
      reasons: [],
      banned: false,
      banCount: 0,
      permaban: false,
      banEndDate: null,
    };
    data.users.push(user);
  }

  user.warnings += 1;
  user.reasons.push({
    date: new Date().toISOString(),
    reason,
    issuedBy,
  });

  if (user.warnings >= warningsForBan(user.banCount) && !user.banned) {
    user.banned = true;
    user.banCount ? user.banCount++ : (user.banCount = 1);

    const endDate = new Date();
    if (user.banCount == 1) endDate.setDate(endDate.getDate() + 1);
    if (user.banCount == 2) endDate.setDate(endDate.getDate() + 3);
    if (user.banCount == 3) endDate.setDate(endDate.getDate() + 7);
    if (user.banCount == 4) endDate.setDate(endDate.getDate() + 31);

    user.banEndDate = endDate.toISOString();

    if (user.banCount > 4) {
      user.permaban = true;
      user.permabanReason = "Llegó a los 5 baneos.";
    }
  }

  saveData(data);
  return user;
}

export function removeWarning(name) {
  const data = loadData();
  const user = data.users.find(
    (user) => user.name.toLowerCase() === name.toLowerCase()
  );

  if (!user || user.warnings === 0) {
    return null;
  }

  user.warnings -= 1;
  if (user.reasons.length > 0) {
    user.reasons.pop();
  }

  if (user.banned && user.warnings < warningsForBan(user.banCount)) {
    user.banned = false;
    user.banEndDate = null;
  }

  saveData(data);
  return user;
}

export function getAllUsers() {
  const data = loadData();
  return data.users;
}

export function getUsersToUnban() {
  const data = loadData();
  const currentDate = new Date();

  return data.users.filter(
    (user) =>
      user.banned &&
      !user.permaban &&
      user.banEndDate &&
      new Date(user.banEndDate) <= currentDate
  );
}

export function clearWarnings(name) {
  const data = loadData();
  const user = data.users.find(
    (user) => user.name.toLowerCase() === name.toLowerCase()
  );

  if (!user) {
    return null;
  }

  user.warnings = 0;
  user.reasons = [];
  user.banned = false;
  user.banEndDate = null;

  saveData(data);
  return user;
}

export function permabanUser(name, reason, endDate = null) {
  const data = loadData();
  let user = data.users.find(
    (user) => user.name.toLowerCase() === name.toLowerCase()
  );

  if (!user) {
    user = {
      name,
      warnings: 0,
      reasons: [],
      banCount: 0,
      banned: true,
      permaban: true,
      permabanReason: reason,
      banEndDate: endDate ? endDate.toISOString() : null,
    };
    data.users.push(user);
  } else {
    user.permaban = true;
    user.banned = true;
    user.permabanReason = reason;
    user.banEndDate = endDate ? endDate.toISOString() : null;
  }

  saveData(data);
  return user;
}

export function removePermaban(name) {
  const data = loadData();
  const user = data.users.find(
    (user) => user.name.toLowerCase() === name.toLowerCase()
  );

  if (!user) {
    return null;
  }

  user.permaban = false;
  user.banned = false;
  user.banEndDate = null;

  saveData(data);
  return user;
}
