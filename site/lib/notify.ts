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

async function operatorChatId(): Promise<string | undefined> {
  try {
    const raw = await readFile(path.join(dataDir(), "operators.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    const first = parsed.find((item): item is string => typeof item === "string" && item.length > 0);
    return first;
  } catch {
    return undefined;
  }
}

async function send(text: string): Promise<number> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = await operatorChatId();
  if (!token || !chatId) return 0;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return response.ok ? 1 : 0;
}

export async function notifyOpened(intent: DepositIntent): Promise<number> {
  return send(
    [
      "Deposit opened",
      `Name: ${intent.name}`,
      `Network: ${intent.chain}`,
      `Amount: ${intent.amount} ${intent.symbol}`,
      `Deposit address: ${intent.address}`,
      "Window: 5 minutes",
      "Transaction id: waiting for payment",
    ].join("\n"),
  );
}

export async function notifyPaid(intent: DepositIntent, txId: string, from: string): Promise<number> {
  return send(
    [
      "Payment sent",
      `Transaction ID: ${txId}`,
      `Reference: ${intent.reference}`,
      `Name: ${intent.name}`,
      `Network: ${intent.chain}`,
      `Amount: ${intent.amount} ${intent.symbol}`,
      `From: ${from}`,
      `Deposit address: ${intent.address}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n"),
  );
}

export async function notifyExpired(intent: DepositIntent): Promise<number> {
  return send(
    [
      "Deposit expired",
      `Reference: ${intent.reference}`,
      `Name: ${intent.name}`,
      `Network: ${intent.chain}`,
      `Amount: ${intent.amount} ${intent.symbol}`,
      `Deposit address: ${intent.address}`,
      "No transaction id. The 5 minute window closed before payment.",
    ].join("\n"),
  );
}
