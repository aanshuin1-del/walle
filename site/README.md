# Twister desk

The site at `twisterwallet.com` is this Next.js app. A deposit shows the treasury address for the selected network and, on Ethereum-compatible networks, can open a wallet transaction to that same address.

## Run

```
cd site
npm install
npm run dev -- --port 41731 --hostname 127.0.0.1
```

Open `http://127.0.0.1:41731/`.

The Telegram listener reads `site/.env.local` and is not started by the web server:

```
node bot/poll.mjs
```

From the operator's Telegram account, send `/operator` to `@twisterprotocolbot`. Deposit intents are then delivered to that chat. `/start` and `/wallet` return a reference code and the treasury addresses. The bot does not generate a private key.

`TELEGRAM_BOT_TOKEN` stays in `.env.local`. Do not commit it. The token was pasted into a chat, so revoke it in BotFather and replace the file.
