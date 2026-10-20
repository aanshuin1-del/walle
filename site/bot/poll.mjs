import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const operatorsFile = path.join(dataDir, "operators.json");

function loadEnv(text) {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

const envFile = await readFile(path.join(root, ".env.local"), "utf8");
loadEnv(envFile);
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.log("missing TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

const CHAINS = [
  ["Ethereum", "0xce6b8715c53012d1dd001d8b01272e89df34da4e"],
  ["Bitcoin", "bc1qzsuhlxs76dkh69rpsevwp3z5hxyyzaqpneh04e"],
  ["Solana", "GMdyHYeCfo16zXye7KVLhV7GneE5ucW856pHAikwyLab"],
  ["Linea", "0xce6b8715c53012d1dd001d8b01272e89df34da4e"],
  ["Arc", "0xce6b8715c53012d1dd001d8b01272e89df34da4e"],
  ["Base", "0xCe6921a4b9fD0b32eac61DE9519B3b1286e59A4E"],
  ["BNB Chain", "0xce6b8715c53012d1dd001d8b01272e89df34da4e"],
  ["Polygon", "0xce6b8715c53012d1dd001d8b01272e89df34da4e"],
  ["Monad", "0xce6b8715c53012d1dd001d8b01272e89df34da4e"],
  ["Optimism", "0xCe6921a4b9fD0b32eac61DE9519B3b1286e59A4E"],
  ["Arbitrum", "0xce6b8715c53012d1dd001d8b01272e89df34da4e"],
  ["Tron", "TSnoGzsm1aDw9UktJbXGL67WiwBS7BiRBQ"],
];

function addressText() {
  return CHAINS.map(([label, address]) => `${label}: ${address}`).join("\n");
}

async function readOperators() {
  try {
    const parsed = JSON.parse(await readFile(operatorsFile, "utf8"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function addOperator(chatId) {
  const current = await readOperators();
  if (current.includes(chatId)) return;
  await mkdir(dataDir, { recursive: true });
  await writeFile(operatorsFile, JSON.stringify([...current, chatId], null, 2));
}

async function send(chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

function reference() {
  return `TW-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
}

let offset = 0;
console.log("listening");

while (true) {
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?timeout=25&offset=${offset}`);
  const payload = await response.json();
  const updates = Array.isArray(payload.result) ? payload.result : [];
  for (const update of updates) {
    offset = update.update_id + 1;
    const message = update.message;
    if (!message?.chat?.id) continue;
    const chatId = String(message.chat.id);
    const text = typeof message.text === "string" ? message.text.trim() : "";
    if (text.startsWith("/operator")) {
      await addOperator(chatId);
      await send(chatId, "This chat will receive deposit intents from the desk.");
    } else if (text.startsWith("/deposit")) {
      await send(chatId, `Pool treasury addresses\n\n${addressText()}\n\nContact @Twisteradmin`);
    } else if (text.startsWith("/wallet") || text.startsWith("/start")) {
      const code = reference();
      await send(
        chatId,
        [
          "Twister pool desk",
          `Reference ${code}`,
          "Send funds only to the treasury address for the network you chose. This bot does not create a secret key.",
          "",
          addressText(),
          "",
          "Contact @Twisteradmin",
          "Operators: send /operator to receive deposit notices.",
        ].join("\n"),
      );
    }
  }
}
