import http from "node:http";
import { Wallet, isAddress } from "ethers";
import { NonceBook, ReplaySet, SlidingWindow } from "./policy.ts";
import { connectProvider, parseRequest, submitWithdrawal } from "./submit.ts";

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.log("missing " + name);
    process.exit(1);
  }
  return value;
}

const key = env("RELAYER_KEY");
const minFee = BigInt(env("MIN_FEE"));
const poolAddress = env("POOL_ADDRESS");
if (!isAddress(poolAddress)) {
  console.log("rejected");
  process.exit(1);
}
const urls = [env("RPC_URL")];
if (process.env.RPC_URL_FALLBACK) urls.push(process.env.RPC_URL_FALLBACK);
const port = Number(process.env.RELAYER_PORT ?? "43127");
const ipWindow = new SlidingWindow(60_000, Number(process.env.RATE_IP ?? "5"));
const addressWindow = new SlidingWindow(60_000, Number(process.env.RATE_ADDRESS ?? "3"));
const replay = new ReplaySet();
const nonces = new NonceBook();

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const raw = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(raw);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/withdraw") {
    send(res, 404, { status: "rejected" });
    return;
  }
  const peer = req.socket.remoteAddress ?? "";
  if (!ipWindow.allow(peer, Date.now())) {
    send(res, 429, { status: "rejected" });
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    send(res, 400, { status: "rejected" });
    return;
  }
  const request = parseRequest(body, minFee);
  if (!request) {
    send(res, 400, { status: "rejected" });
    return;
  }
  if (!addressWindow.allow(request.recipient.toLowerCase(), Date.now())) {
    send(res, 429, { status: "rejected" });
    return;
  }
  const replayKey = request.denomination.toString() + ":" + request.nullifierHash.toString();
  if (!replay.claim(replayKey)) {
    send(res, 409, { status: "rejected" });
    return;
  }
  const provider = await connectProvider(urls);
  if (!provider) {
    replay.release(replayKey);
    send(res, 503, { status: "rpc unavailable" });
    return;
  }
  let wallet: Wallet;
  try {
    wallet = new Wallet(key, provider);
  } catch {
    provider.destroy();
    replay.release(replayKey);
    send(res, 400, { status: "rejected" });
    return;
  }
  if (wallet.address.toLowerCase() === request.recipient.toLowerCase()) {
    provider.destroy();
    replay.release(replayKey);
    send(res, 400, { status: "rejected" });
    return;
  }
  const hash = await submitWithdrawal(provider, wallet, poolAddress, request, nonces);
  provider.destroy();
  if (!hash) {
    replay.release(replayKey);
    send(res, 502, { status: "submit failed" });
    return;
  }
  replay.commit(replayKey);
  send(res, 200, { status: "submitted", tx: hash });
});

server.listen(port, "127.0.0.1", () => {
  console.log("listening");
});
