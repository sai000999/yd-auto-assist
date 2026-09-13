/**
 * Y2M Tickets — Discord gateway relay.
 *
 * Slash commands and buttons are handled by the website itself. This tiny
 * always-on script only listens to messages inside ticket channels and
 * forwards them to the site so the AI and automations can answer.
 *
 * Run it anywhere that stays online (Railway, Fly.io, a VPS, your own PC):
 *
 *   DISCORD_BOT_TOKEN=...  \
 *   RELAY_URL=https://your-site.lovable.app/api/public/discord/events \
 *   BOT_RELAY_SECRET=...  \
 *   node scripts/discord-gateway-bot.mjs
 *
 * Requires Node 18+ (built-in WebSocket on Node 22, otherwise `npm i ws`).
 */

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const RELAY_URL = process.env.RELAY_URL;
const RELAY_SECRET = process.env.BOT_RELAY_SECRET;

if (!TOKEN || !RELAY_URL || !RELAY_SECRET) {
  console.error("Missing DISCORD_BOT_TOKEN, RELAY_URL or BOT_RELAY_SECRET");
  process.exit(1);
}

const GATEWAY = "wss://gateway.discord.gg/?v=10&encoding=json";
const INTENTS = (1 << 0) | (1 << 9) | (1 << 15); // GUILDS, GUILD_MESSAGES, MESSAGE_CONTENT

let ws;
let heartbeat;
let seq = null;

function connect() {
  ws = new WebSocket(GATEWAY);

  ws.onmessage = async (raw) => {
    const payload = JSON.parse(raw.data);
    if (payload.s) seq = payload.s;

    if (payload.op === 10) {
      clearInterval(heartbeat);
      heartbeat = setInterval(
        () => ws.send(JSON.stringify({ op: 1, d: seq })),
        payload.d.heartbeat_interval,
      );
      ws.send(
        JSON.stringify({
          op: 2,
          d: { token: TOKEN, intents: INTENTS, properties: { os: "linux", browser: "y2m", device: "y2m" } },
        }),
      );
      return;
    }

    if (payload.op === 0 && payload.t === "READY") {
      console.log(`Connected as ${payload.d.user.username}`);
      return;
    }

    if (payload.op === 0 && payload.t === "MESSAGE_CREATE") {
      const m = payload.d;
      if (m.author?.bot || !m.guild_id || !m.content) return;
      try {
        const res = await fetch(RELAY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-relay-secret": RELAY_SECRET },
          body: JSON.stringify({
            type: "MESSAGE_CREATE",
            guild_id: m.guild_id,
            channel_id: m.channel_id,
            author_id: m.author.id,
            author_name: m.author.global_name || m.author.username,
            content: m.content,
          }),
        });
        if (!res.ok) console.error("Relay error", res.status, await res.text());
      } catch (error) {
        console.error("Relay failed", error);
      }
    }
  };

  ws.onclose = () => {
    clearInterval(heartbeat);
    console.log("Disconnected — reconnecting in 5s");
    setTimeout(connect, 5000);
  };

  ws.onerror = (error) => console.error("Gateway error", error);
}

connect();
