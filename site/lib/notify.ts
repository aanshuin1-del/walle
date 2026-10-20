import { mkdir, readFile, appendFile } from "node:fs/promises";
import path from "node:path";

export type DepositIntent = {
  at: string;
  name: string;
  chain: string;
  amount: string;
  symbol: string;
  address: string;
  reference: string;
};

function dataDir(): string {
  return path.join(process.cwd(), "data");
}

export async function recordIntent(intent: DepositIntent): Promise<void> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  await appendFile(path.join(dir, "deposits.jsonl"), JSON.stringify(intent) + "\n", "utf8");
}

export async function operatorChatIds(): Promise<string[]> {
  try {
    const raw = await readFile(path.join(dataDir(), "operators.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export async function notifyOperators(intent: DepositIntent): Promise<number> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chats = await operatorChatIds();
  if (!token || chats.length === 0) return 0;
  const text = [
    "Deposit intent",
    `Name: ${intent.name}`,
    `Chain: ${intent.chain}`,
    `Amount: ${intent.amount} ${intent.symbol}`,
    `Reference: ${intent.reference}`,
    `Address: ${intent.address}`,
  ].join("\n");
  let sent = 0;
  for (const chatId of chats) {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (response.ok) sent += 1;
  }
  return sent;
}
