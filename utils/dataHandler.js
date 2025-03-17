import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
    };
    data.users.push(user);
  }

  user.warnings += 1;
  user.reasons.push({
    date: new Date().toISOString(),
    reason,
    issuedBy,
  });

  if (user.warnings >= 5 && !user.banned) {
    user.banned = true;
    user.banCount ? user.banCount++ : (user.banCount = 1);
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

  if (user.banned && user.warnings < 5) {
    user.banned = false;
  }

  saveData(data);
  return user;
}

export function getAllUsers() {
  const data = loadData();
  return data.users;
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

  saveData(data);
  return user;
}

export function permabanUser(name, reason, issuedBy) {
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
      permaban: true,
      permabanReason: reason,
    };
    data.users.push(user);
  } else {
    user.permaban = true;
    user.permabanReason = reason;
  }

  saveData(data);
  return user;
}
