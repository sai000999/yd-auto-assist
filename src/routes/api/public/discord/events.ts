import { createFileRoute } from "@tanstack/react-router";

type RelayEvent = {
  type: "MESSAGE_CREATE";
  guild_id: string;
  channel_id: string;
  author_id: string;
  author_name: string;
  is_staff?: boolean;
  content: string;
};

/**
 * Receives live Discord gateway events from the relay bot
 * (see scripts/discord-gateway-bot.mjs). Secured with BOT_RELAY_SECRET.
 */
export const Route = createFileRoute("/api/public/discord/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["BOT_RELAY_SECRET"];
        const provided = request.headers.get("x-relay-secret");
        if (!secret || provided !== secret) {
          return new Response("unauthorized", { status: 401 });
        }

        let event: RelayEvent;
        try {
          event = (await request.json()) as RelayEvent;
        } catch {
          return new Response("bad request", { status: 400 });
        }

        if (event.type !== "MESSAGE_CREATE" || !event.guild_id || !event.channel_id) {
          return Response.json({ ok: true, ignored: true });
        }
        if (!event.content?.trim()) return Response.json({ ok: true, ignored: true });

        const { handleTicketMessage } = await import("@/lib/ticket-engine.server");
        try {
          const result = await handleTicketMessage({
            guildId: event.guild_id,
            channelId: event.channel_id,
            authorId: event.author_id,
            authorName: event.author_name,
            content: event.content,
            source: event.is_staff ? "staff" : "user",
          });
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("relay event failed", error);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
