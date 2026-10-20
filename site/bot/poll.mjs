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

async function claimOperator(chatId) {
  const code = process.env.TELEGRAM_OPERATOR_CODE;
  const current = await readOperators();
  if (current[0] === chatId) return "already";
  if (current.length > 0) return "taken";
  if (!code) return "missing";
  await mkdir(dataDir, { recursive: true });
  await writeFile(operatorsFile, JSON.stringify([chatId], null, 2));
  return "claimed";
}

async function send(chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
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
      const given = text.slice("/operator".length).trim();
      if (given !== process.env.TELEGRAM_OPERATOR_CODE) {
        await send(chatId, "That code does not match. Deposit notices stay with the operator.");
        continue;
      }
      const result = await claimOperator(chatId);
      const reply = {
        claimed: "This chat is the only one that receives deposit notices.",
        already: "This chat already receives the deposit notices.",
        taken: "Deposit notices already go to the operator.",
        missing: "The desk has no operator code configured.",
      }[result];
      await send(chatId, reply);
    } else if (text.startsWith("/deposit")) {
      await send(chatId, `Pool treasury addresses\n\n${addressText()}\n\nContact @Twisteradmin`);
    } else if (text.startsWith("/wallet") || text.startsWith("/start")) {
      await send(
        chatId,
        [
          "Twister pool desk",
          "A deposit address appears when you press Deposit. The transaction id appears after the wallet pays, inside a 5 minute window.",
          "This bot does not create a secret key.",
          "",
          addressText(),
          "",
          "Contact @Twisteradmin",
        ].join("\n"),
      );
    }
  }
}
