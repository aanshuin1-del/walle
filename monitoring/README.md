# Monitoring

Eyes on glass, for this repository, is one JSON document. There is no dashboard, no Grafana file, and no alert sink.

## Health check

`server.ts` listens on `127.0.0.1:43131`. `GET /health` calls `eth_blockNumber` and then `eth_gasPrice` on `RPC_URL`.

A live endpoint returns 200:

```
{"ok":true,"rpcLatencyMs":12,"gasPriceWei":"1000000000"}
```

`rpcLatencyMs` is the time for `eth_blockNumber` only. `gasPriceWei` is the decimal wei value of `eth_gasPrice`. If the RPC does not answer, the status is 503 and `ok` is false. The process logs the word `listening` and nothing about the request.

```
cd monitoring
npm install
RPC_URL=http://127.0.0.1:8545 node --experimental-strip-types server.ts
```

`MONITOR_PORT` overrides 43131. The URL is the operator's. The server does not embed one.
