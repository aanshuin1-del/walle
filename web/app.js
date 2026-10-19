var MASK64 = (1n << 64n) - 1n;
var SECP_P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
var SECP_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
var SECP_GX = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
var SECP_GY = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;
var LIVE_SET_SELECTOR = "0x07bf4cf8";

var KECCAK_ROTC = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44];
var KECCAK_PILN = [10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1];
var KECCAK_RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n
];

var requestSerial = 0;
var latestRecipient = "";

function rotl64(x, n) {
  var shift = BigInt(n);
  return ((x << shift) | (x >> (64n - shift))) & MASK64;
}

function keccakF(state) {
  var bc = [0n, 0n, 0n, 0n, 0n];
  var round;
  var i;
  var j;
  var t;
  for (round = 0; round < 24; round++) {
    for (i = 0; i < 5; i++) {
      bc[i] = state[i] ^ state[i + 5] ^ state[i + 10] ^ state[i + 15] ^ state[i + 20];
    }
    for (i = 0; i < 5; i++) {
      t = (bc[(i + 4) % 5] ^ rotl64(bc[(i + 1) % 5], 1)) & MASK64;
      for (j = 0; j < 25; j += 5) state[j + i] = (state[j + i] ^ t) & MASK64;
    }
    t = state[1];
    for (i = 0; i < 24; i++) {
      j = KECCAK_PILN[i];
      bc[0] = state[j];
      state[j] = rotl64(t, KECCAK_ROTC[i]);
      t = bc[0];
    }
    for (j = 0; j < 25; j += 5) {
      for (i = 0; i < 5; i++) bc[i] = state[j + i];
      for (i = 0; i < 5; i++) {
        state[j + i] = (state[j + i] ^ ((~bc[(i + 1) % 5]) & bc[(i + 2) % 5])) & MASK64;
      }
    }
    state[0] = (state[0] ^ KECCAK_RC[round]) & MASK64;
  }
}

function keccak256(bytes) {
  var rate = 136;
  var q = rate - (bytes.length % rate);
  var padded = new Uint8Array(bytes.length + q);
  var state = new Array(25).fill(0n);
  var offset;
  var i;
  var lane;
  var out;
  padded.set(bytes);
  if (q === 1) padded[padded.length - 1] = 0x81;
  else {
    padded[bytes.length] = 0x01;
    padded[padded.length - 1] = 0x80;
  }
  for (offset = 0; offset < padded.length; offset += rate) {
    for (i = 0; i < rate; i++) {
      lane = (i / 8) | 0;
      state[lane] = (state[lane] ^ (BigInt(padded[offset + i]) << BigInt((i % 8) * 8))) & MASK64;
    }
    keccakF(state);
  }
  out = new Uint8Array(32);
  for (i = 0; i < 32; i++) {
    lane = (i / 8) | 0;
    out[i] = Number((state[lane] >> BigInt((i % 8) * 8)) & 0xffn);
  }
  return out;
}

function bytesToHex(bytes) {
  var hex = "";
  var i;
  for (i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

function hexToBytes(hex) {
  var bytes = new Uint8Array(hex.length / 2);
  var i;
  for (i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function mod(a, m) {
  var r = a % m;
  return r >= 0n ? r : r + m;
}

function modPow(base, exp, m) {
  var result = 1n;
  var b = mod(base, m);
  var e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return result;
}

function modInv(a, m) {
  return modPow(a, m - 2n, m);
}

function pointAdd(p, q) {
  var x1;
  var y1;
  var x2;
  var y2;
  var slope;
  var x3;
  var y3;
  if (p === null) return q;
  if (q === null) return p;
  x1 = p[0];
  y1 = p[1];
  x2 = q[0];
  y2 = q[1];
  if (x1 === x2) {
    if ((y1 + y2) % SECP_P === 0n) return null;
    slope = mod(3n * x1 * x1 * modInv(2n * y1, SECP_P), SECP_P);
  } else {
    slope = mod((y2 - y1) * modInv(mod(x2 - x1, SECP_P), SECP_P), SECP_P);
  }
  x3 = mod(slope * slope - x1 - x2, SECP_P);
  y3 = mod(slope * (x1 - x3) - y1, SECP_P);
  return [x3, y3];
}

function scalarMult(k, point) {
  var result = null;
  var addend = point;
  var scalar = k;
  while (scalar > 0n) {
    if (scalar & 1n) result = pointAdd(result, addend);
    addend = pointAdd(addend, addend);
    scalar >>= 1n;
  }
  return result;
}

function checksumAddress(lowerHex) {
  var hash = keccak256(new TextEncoder().encode(lowerHex));
  var out = "0x";
  var i;
  var nibble;
  for (i = 0; i < 40; i++) {
    nibble = (hash[i >> 1] >> (i % 2 === 0 ? 4 : 0)) & 0xf;
    out += nibble >= 8 ? lowerHex[i].toUpperCase() : lowerHex[i];
  }
  return out;
}

function privateKeyToAddress(privateKey) {
  var point = scalarMult(privateKey, [SECP_GX, SECP_GY]);
  var xy = hexToBytes(point[0].toString(16).padStart(64, "0") + point[1].toString(16).padStart(64, "0"));
  var hash = keccak256(xy);
  return checksumAddress(bytesToHex(hash.slice(12)));
}

function freshRecipient() {
  var bytes = new Uint8Array(32);
  var privateKey = 0n;
  var i;
  do {
    crypto.getRandomValues(bytes);
    privateKey = 0n;
    for (i = 0; i < bytes.length; i++) privateKey = (privateKey << 8n) + BigInt(bytes[i]);
  } while (privateKey === 0n || privateKey >= SECP_N);
  return {
    privateKey: "0x" + privateKey.toString(16).padStart(64, "0"),
    address: privateKeyToAddress(privateKey)
  };
}

function rpcUrl(value) {
  var url;
  try {
    url = new URL(value);
  } catch (err) {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url.toString();
}

function poolAddress(value) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) return null;
  return value;
}

function readLiveSetSize(url, pool, denomination) {
  var data = LIVE_SET_SELECTOR + denomination.toString(16).padStart(64, "0");
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: pool, data: data }, "latest"]
    })
  }).then(function (response) {
    if (!response.ok) throw new Error("rpc");
    return response.json();
  }).then(function (payload) {
    if (!payload || payload.error || typeof payload.result !== "string") throw new Error("rpc");
    if (!/^0x[0-9a-fA-F]{64}$/.test(payload.result)) throw new Error("rpc");
    return BigInt(payload.result);
  });
}

function setStatus(text, isError) {
  var status = document.getElementById("status");
  status.textContent = text;
  status.className = isError ? "error" : "";
}

function clearWithdrawal() {
  latestRecipient = "";
  document.getElementById("setSize").textContent = "";
  document.getElementById("warning").textContent = "";
  document.getElementById("warning").className = "";
  document.getElementById("recipient").textContent = "";
  document.getElementById("withdrawNote").textContent = "";
  document.getElementById("withdraw").disabled = true;
}

function showSet(size) {
  var warning = document.getElementById("warning");
  var recipient = freshRecipient();
  var list = document.getElementById("recipient");
  var addressTerm;
  var addressValue;
  var keyTerm;
  var keyValue;
  latestRecipient = recipient.address;
  document.getElementById("setSize").textContent = "You are withdrawing from a set of " + size.toString() + ".";
  if (size < 10n) {
    warning.textContent = "Anonymity set is small. Withdrawal may be linkable by timing or amount.";
    warning.className = "show";
  } else {
    warning.textContent = "";
    warning.className = "";
  }
  list.textContent = "";
  addressTerm = document.createElement("dt");
  addressTerm.textContent = "Fresh recipient";
  addressValue = document.createElement("dd");
  addressValue.id = "recipientAddress";
  addressValue.textContent = recipient.address;
  keyTerm = document.createElement("dt");
  keyTerm.textContent = "Private key for that address. It stays in this page. A new load replaces it.";
  keyValue = document.createElement("dd");
  keyValue.id = "recipientKey";
  keyValue.textContent = recipient.privateKey;
  list.appendChild(addressTerm);
  list.appendChild(addressValue);
  list.appendChild(keyTerm);
  list.appendChild(keyValue);
  document.getElementById("withdraw").disabled = false;
  setStatus("Set size has been read.", false);
}

function boot() {
  var form = document.getElementById("form");
  var rpc = document.getElementById("rpc");
  var pool = document.getElementById("pool");
  var denom = document.getElementById("denom");
  var withdraw = document.getElementById("withdraw");
  withdraw.textContent = "Check set size and preview.";
  document.getElementById("withdrawHelp").textContent =
    "This client reads the pool. It does not build a Groth16 proof and does not broadcast.";

  function invalidate() {
    requestSerial += 1;
    clearWithdrawal();
    setStatus("Set size has not been read.", false);
  }

  rpc.addEventListener("input", invalidate);
  pool.addEventListener("input", invalidate);
  denom.addEventListener("change", invalidate);

  form.addEventListener("submit", function (event) {
    var url;
    var address;
    var denomination;
    var serial;
    event.preventDefault();
    url = rpcUrl(rpc.value.trim());
    address = poolAddress(pool.value.trim());
    if (!url) {
      invalidate();
      setStatus("Enter an RPC URL.", true);
      return;
    }
    if (!address) {
      invalidate();
      setStatus("Enter the pool address.", true);
      return;
    }
    denomination = BigInt(denom.value);
    serial = ++requestSerial;
    clearWithdrawal();
    setStatus("Reading set size.", false);
    readLiveSetSize(url, address, denomination).then(function (size) {
      if (serial !== requestSerial) return;
      showSet(size);
    }).catch(function () {
      if (serial !== requestSerial) return;
      clearWithdrawal();
      setStatus("The RPC request failed.", true);
    });
  });

  withdraw.addEventListener("click", function () {
    var url = rpcUrl(rpc.value.trim());
    var address = poolAddress(pool.value.trim());
    var denomination;
    var serial;
    var shown;
    if (withdraw.disabled || !url || !address || !latestRecipient) return;
    denomination = BigInt(denom.value);
    shown = latestRecipient;
    serial = ++requestSerial;
    setStatus("Reading set size.", false);
    readLiveSetSize(url, address, denomination).then(function (size) {
      var sentence = "You are withdrawing from a set of " + size.toString() + ".";
      if (serial !== requestSerial) return;
      if (!document.getElementById("recipientAddress") || document.getElementById("recipientAddress").textContent !== shown) return;
      if (document.getElementById("setSize").textContent !== sentence) showSet(size);
      else setStatus("Set size has been read.", false);
      document.getElementById("withdrawNote").textContent =
        "Set size checked. This client does not build a Groth16 proof and does not broadcast a transaction.";
    }).catch(function () {
      if (serial !== requestSerial) return;
      clearWithdrawal();
      setStatus("The RPC request failed.", true);
    });
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", boot);
}
