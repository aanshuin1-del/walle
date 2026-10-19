import http from "node:http";
import { JsonRpcProvider } from "ethers";
import { sample } from "./sample.ts";

const rpcUrl = process.env.RPC_URL;
if (!rpcUrl) {
  console.log("missing RPC_URL");
  process.exit(1);
}
const port = Number(process.env.MONITOR_PORT ?? "43131");
const provider = new JsonRpcProvider(rpcUrl);

const server = http.createServer(async (req, res) => {
  if (req.method !== "GET" || req.url !== "/health") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
    return;
  }
  const health = await sample(provider);
  res.writeHead(health.ok ? 200 : 503, { "content-type": "application/json" });
  res.end(JSON.stringify(health));
});

server.listen(port, "127.0.0.1", () => {
  console.log("listening");
});
