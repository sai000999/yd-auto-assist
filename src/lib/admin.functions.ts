import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: { rpc: (fn: string, args: object) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Forbidden");
}

export const registerCommands = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ guildId: z.string().min(5) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { registerSlashCommands } = await import("@/lib/discord.server");
    await registerSlashCommands(data.guildId);
    return { ok: true };
  });

export const postPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ channelId: z.string().min(5), message: z.string().max(1500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { sendMessage, TICKET_PANEL_COMPONENTS } = await import("@/lib/discord.server");
    await sendMessage(
      data.channelId,
      data.message?.trim() ||
        "**Y2M Tickets** — need help? Press the button below and our assistant will help you right away.",
      TICKET_PANEL_COMPONENTS,
    );
    return { ok: true };
  });

export const sendStaffReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ ticketId: z.string().uuid(), content: z.string().min(1).max(1800) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendMessage } = await import("@/lib/discord.server");

    const { data: ticket } = await supabaseAdmin
      .from("tickets")
      .select("id, channel_id")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (!ticket?.channel_id) throw new Error("Ticket has no Discord channel");

    await sendMessage(ticket.channel_id, data.content);
    await supabaseAdmin.from("ticket_messages").insert({
      ticket_id: ticket.id,
      author_name: "Staff (dashboard)",
      source: "staff",
      content: data.content,
    });
    return { ok: true };
  });

export const closeTicketFromDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ ticketId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { closeTicket } = await import("@/lib/ticket-engine.server");
    await closeTicket({ ticketId: data.ticketId, closedBy: "a staff member" });
    return { ok: true };
  });

export const getBotStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    return {
      hasToken: !!process.env["DISCORD_BOT_TOKEN"],
      hasPublicKey: !!process.env["DISCORD_PUBLIC_KEY"],
      hasAppId: !!process.env["DISCORD_APPLICATION_ID"],
      hasAiKey: !!process.env["LOVABLE_API_KEY"],
      applicationId: process.env["DISCORD_APPLICATION_ID"] ?? null,
    };
  });
