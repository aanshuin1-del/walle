import { NextResponse } from "next/server";
import { chainById } from "@/lib/chains";
import { notifyExpired, type DepositIntent } from "@/lib/notify";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send the deposit as JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Send the deposit as JSON." }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const chain = chainById(typeof record.chainId === "string" ? record.chainId : "");
  const reference = typeof record.reference === "string" ? record.reference.trim() : "";
  if (!chain || chain.address !== record.address || !/^TW-[0-9A-F]{8}$/.test(reference)) {
    return NextResponse.json({ error: "This window does not match an open deposit." }, { status: 400 });
  }
  const intent: DepositIntent = {
    at: new Date().toISOString(),
    name: typeof record.name === "string" ? record.name : "",
    chain: chain.label,
    amount: typeof record.amount === "string" ? record.amount : "",
    symbol: chain.symbol,
    address: chain.address,
    reference,
  };
  const notified = await notifyExpired(intent);
  return NextResponse.json({ ok: true, notified });
}
