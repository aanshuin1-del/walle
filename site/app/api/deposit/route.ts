import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { chainById } from "@/lib/chains";
import { notifyOperators, recordIntent } from "@/lib/notify";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON with a name, a chain, and an amount." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Send JSON with a name, a chain, and an amount." }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const chainId = typeof record.chainId === "string" ? record.chainId : "";
  const amount = typeof record.amount === "string" ? record.amount.trim() : "";
  const chain = chainById(chainId);
  if (name.length < 2 || !chain || !/^\d+(\.\d{1,18})?$/.test(amount) || Number(amount) <= 0) {
    return NextResponse.json({ error: "Choose a network and an amount greater than zero." }, { status: 400 });
  }
  const intent = {
    at: new Date().toISOString(),
    name,
    chain: chain.label,
    amount,
    symbol: chain.symbol,
    address: chain.address,
    reference: `TW-${randomBytes(4).toString("hex").toUpperCase()}`,
  };
  await recordIntent(intent);
  const notified = await notifyOperators(intent);
  return NextResponse.json({ ...intent, notified });
}
