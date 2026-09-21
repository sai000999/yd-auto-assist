import { createFileRoute } from "@tanstack/react-router";

type InteractionUser = { id: string; username: string; global_name?: string };
type Interaction = {
  type: number;
  guild_id?: string;
  channel_id?: string;
  data?: {
    name?: string;
    custom_id?: string;
    options?: { name: string; value: string }[];
  };
  member?: { user: InteractionUser };
  user?: InteractionUser;
};

function reply(content: string, ephemeral = true) {
  return Response.json({
    type: 4,
    data: { content, ...(ephemeral ? { flags: 64 } : {}) },
  });
}

export const Route = createFileRoute("/api/public/discord/interactions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const { verifyDiscordRequest, sendMessage, TICKET_PANEL_COMPONENTS } = await import(
          "@/lib/discord.server"
        );

        if (!(await verifyDiscordRequest(request, raw))) {
          return new Response("invalid request signature", { status: 401 });
        }

        const interaction = JSON.parse(raw) as Interaction;
        if (interaction.type === 1) return Response.json({ type: 1 });

        const user = interaction.member?.user ?? interaction.user;
        const guildId = interaction.guild_id;
        if (!user || !guildId) return reply("This only works inside a server.");

        const username = user.global_name || user.username;
        const { openTicket, closeTicket, ensureGuild } = await import("@/lib/ticket-engine.server");

        try {
          // Slash commands
          if (interaction.type === 2) {
            const name = interaction.data?.name;
            if (name === "ticket") {
              const subject = interaction.data?.options?.find((o) => o.name === "subject")?.value;
              const result = await openTicket({
                guildId,
                userId: user.id,
                username,
                ...(subject ? { subject } : {}),
              });
              return reply(
                result.alreadyOpen
                  ? `You already have an open ticket: <#${result.channelId}>`
                  : `Your ticket is ready: <#${result.channelId}>`,
              );
            }
            if (name === "close") {
              const closed = await closeTicket({
                ...(interaction.channel_id ? { channelId: interaction.channel_id } : {}),
                closedBy: username,
              });
              return reply(closed ? "Ticket closed." : "This channel is not an open ticket.");
            }
            if (name === "panel") {
              await ensureGuild(guildId);
              await sendMessage(
                interaction.channel_id!,
                "**Y2M Tickets** — need help? Press the button below and our assistant will help you right away.",
                TICKET_PANEL_COMPONENTS,
              );
              return reply("Panel posted.");
            }
          }

          // Buttons
          if (interaction.type === 3) {
            const id = interaction.data?.custom_id;
            if (id === "y2m_open") {
              const result = await openTicket({ guildId, userId: user.id, username });
              return reply(
                result.alreadyOpen
                  ? `You already have an open ticket: <#${result.channelId}>`
                  : `Your ticket is ready: <#${result.channelId}>`,
              );
            }
            if (id === "y2m_close") {
              const closed = await closeTicket({
                ...(interaction.channel_id ? { channelId: interaction.channel_id } : {}),
                closedBy: username,
              });
              return reply(closed ? "Ticket closed." : "This ticket is already closed.");
            }
          }
        } catch (error) {
          console.error("interaction failed", error);
          return reply("Something went wrong handling that. Please try again or contact staff.");
        }

        return reply("Unsupported action.");
      },
    },
  },
});
