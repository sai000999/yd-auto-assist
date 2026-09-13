const API = "https://discord.com/api/v10";

function token() {
  const t = process.env["DISCORD_BOT_TOKEN"];
  if (!t) throw new Error("DISCORD_BOT_TOKEN is not configured");
  return t;
}

export async function discordFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord API ${res.status} on ${path}: ${body}`);
  }
  return res.status === 204 ? null : await res.json();
}

export async function sendMessage(channelId: string, content: string, components?: unknown[]) {
  return discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, ...(components ? { components } : {}) }),
  });
}

export async function createTicketChannel(opts: {
  guildId: string;
  name: string;
  parentId?: string | null;
  userId: string;
  staffRoleId?: string | null;
  topic?: string;
}) {
  const overwrites: Record<string, unknown>[] = [
    { id: opts.guildId, type: 0, deny: "1024" }, // @everyone: deny VIEW_CHANNEL
    { id: opts.userId, type: 1, allow: "3072" }, // user: view + send
  ];
  if (opts.staffRoleId) overwrites.push({ id: opts.staffRoleId, type: 0, allow: "3072" });

  return (await discordFetch(`/guilds/${opts.guildId}/channels`, {
    method: "POST",
    body: JSON.stringify({
      name: opts.name,
      type: 0,
      parent_id: opts.parentId || undefined,
      topic: opts.topic,
      permission_overwrites: overwrites,
    }),
  })) as { id: string; name: string };
}

export async function deleteChannel(channelId: string) {
  return discordFetch(`/channels/${channelId}`, { method: "DELETE" });
}

export async function lockChannel(channelId: string, guildId: string) {
  return discordFetch(`/channels/${channelId}/permissions/${guildId}`, {
    method: "PUT",
    body: JSON.stringify({ type: 0, deny: "3072", allow: "0" }),
  });
}

const encoder = new TextEncoder();

function hexToBytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Verify a Discord interaction request (Ed25519). */
export async function verifyDiscordRequest(request: Request, rawBody: string) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const publicKey = process.env["DISCORD_PUBLIC_KEY"];
  if (!signature || !timestamp || !publicKey) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      hexToBytes(signature),
      encoder.encode(timestamp + rawBody),
    );
  } catch (error) {
    console.error("Interaction signature verification failed", error);
    return false;
  }
}

export const SLASH_COMMANDS = [
  {
    name: "ticket",
    description: "Open a new support ticket",
    options: [
      { name: "subject", description: "What do you need help with?", type: 3, required: false },
    ],
  },
  { name: "close", description: "Close the current ticket" },
  {
    name: "panel",
    description: "Post the Y2M Tickets panel in this channel (staff only)",
    default_member_permissions: "32",
  },
];

export async function registerSlashCommands(guildId?: string) {
  const appId = process.env["DISCORD_APPLICATION_ID"];
  if (!appId) throw new Error("DISCORD_APPLICATION_ID is not configured");
  const path = guildId
    ? `/applications/${appId}/guilds/${guildId}/commands`
    : `/applications/${appId}/commands`;
  return discordFetch(path, { method: "PUT", body: JSON.stringify(SLASH_COMMANDS) });
}

export const TICKET_PANEL_COMPONENTS = [
  {
    type: 1,
    components: [
      { type: 2, style: 1, label: "Open a ticket", emoji: { name: "🎫" }, custom_id: "y2m_open" },
    ],
  },
];

export const TICKET_CONTROL_COMPONENTS = [
  {
    type: 1,
    components: [
      { type: 2, style: 4, label: "Close ticket", emoji: { name: "🔒" }, custom_id: "y2m_close" },
    ],
  },
];
