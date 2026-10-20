import { NextResponse } from "next/server";
import { chainById } from "@/lib/chains";
import { notifyPaid, type DepositIntent } from "@/lib/notify";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send the payment details as JSON." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Send the payment details as JSON." }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const chain = chainById(typeof record.chainId === "string" ? record.chainId : "");
  const reference = typeof record.reference === "string" ? record.reference.trim() : "";
  const txId = typeof record.txId === "string" ? record.txId.trim() : "";
  const from = typeof record.from === "string" ? record.from.trim() : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const amount = typeof record.amount === "string" ? record.amount.trim() : "";
  if (!chain || chain.address !== record.address || !/^TW-[0-9A-F]{8}$/.test(reference)) {
    return NextResponse.json({ error: "This payment does not match an open deposit." }, { status: 400 });
  }
  if (!/^[A-Za-z0-9]{16,128}$/.test(txId)) {
    return NextResponse.json({ error: "The wallet did not return a transaction id." }, { status: 400 });
  }
  const intent: DepositIntent = {
    at: new Date().toISOString(),
    name,
    chain: chain.label,
    amount,
    symbol: chain.symbol,
    address: chain.address,
    reference,
  };
  const notified = await notifyPaid(intent, txId, from || "wallet");
  return NextResponse.json({ ok: true, notified, txId, reference });
}
