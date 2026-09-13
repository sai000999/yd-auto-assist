import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateAiReply } from "./ai.server";
import {
  createTicketChannel,
  lockChannel,
  sendMessage,
  TICKET_CONTROL_COMPONENTS,
} from "./discord.server";

export type Guild = {
  guild_id: string;
  name: string;
  ticket_category_id: string | null;
  staff_role_id: string | null;
  log_channel_id: string | null;
  panel_channel_id: string | null;
  welcome_message: string;
};

export type AiSettings = {
  guild_id: string;
  enabled: boolean;
  model: string;
  system_prompt: string;
  knowledge_base: string;
  auto_reply_first_message: boolean;
  auto_reply_all_messages: boolean;
};

export async function ensureGuild(guildId: string, name?: string): Promise<Guild> {
  const { data } = await supabaseAdmin
    .from("guilds")
    .select("*")
    .eq("guild_id", guildId)
    .maybeSingle();
  if (data) return data as Guild;
  const { data: created, error } = await supabaseAdmin
    .from("guilds")
    .insert({ guild_id: guildId, name: name ?? "Discord Server" })
    .select("*")
    .single();
  if (error) throw error;
  return created as Guild;
}

export async function ensureAiSettings(guildId: string): Promise<AiSettings> {
  const { data } = await supabaseAdmin
    .from("ai_settings")
    .select("*")
    .eq("guild_id", guildId)
    .maybeSingle();
  if (data) return data as AiSettings;
  const { data: created, error } = await supabaseAdmin
    .from("ai_settings")
    .insert({ guild_id: guildId })
    .select("*")
    .single();
  if (error) throw error;
  return created as AiSettings;
}

async function log(guild: Guild, content: string) {
  if (!guild.log_channel_id) return;
  try {
    await sendMessage(guild.log_channel_id, content);
  } catch (error) {
    console.error("log channel failed", error);
  }
}

export async function openTicket(opts: {
  guildId: string;
  userId: string;
  username: string;
  subject?: string;
  guildName?: string;
}) {
  const guild = await ensureGuild(opts.guildId, opts.guildName);

  const { data: existing } = await supabaseAdmin
    .from("tickets")
    .select("id, channel_id")
    .eq("guild_id", opts.guildId)
    .eq("discord_user_id", opts.userId)
    .eq("status", "open")
    .maybeSingle();
  if (existing?.channel_id) {
    return { alreadyOpen: true as const, channelId: existing.channel_id, ticketId: existing.id };
  }

  const safeName = `ticket-${opts.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "user"}`;
  const channel = await createTicketChannel({
    guildId: opts.guildId,
    name: safeName,
    parentId: guild.ticket_category_id,
    userId: opts.userId,
    staffRoleId: guild.staff_role_id,
    topic: opts.subject ?? "Support ticket",
  });

  const { data: ticket, error } = await supabaseAdmin
    .from("tickets")
    .insert({
      guild_id: opts.guildId,
      channel_id: channel.id,
      discord_user_id: opts.userId,
      discord_username: opts.username,
      subject: opts.subject?.slice(0, 200) || "Support request",
    })
    .select("*")
    .single();
  if (error) throw error;

  const intro = `<@${opts.userId}> ${guild.welcome_message}`;
  await sendMessage(channel.id, intro, TICKET_CONTROL_COMPONENTS);
  await supabaseAdmin.from("ticket_messages").insert({
    ticket_id: ticket.id,
    author_name: "Y2M Tickets",
    source: "system",
    content: guild.welcome_message,
  });

  await log(guild, `🎫 Ticket #${ticket.ticket_number} opened by <@${opts.userId}> in <#${channel.id}>`);

  if (opts.subject) {
    await handleTicketMessage({
      guildId: opts.guildId,
      channelId: channel.id,
      authorId: opts.userId,
      authorName: opts.username,
      content: opts.subject,
      isFirst: true,
    });
  }

  return { alreadyOpen: false as const, channelId: channel.id, ticketId: ticket.id };
}

export async function closeTicket(opts: {
  channelId?: string;
  ticketId?: string;
  closedBy: string;
  deleteChannelAfter?: boolean;
}) {
  const query = supabaseAdmin.from("tickets").select("*").eq("status", "open");
  const { data: ticket } = opts.ticketId
    ? await query.eq("id", opts.ticketId).maybeSingle()
    : await query.eq("channel_id", opts.channelId ?? "").maybeSingle();
  if (!ticket) return null;

  await supabaseAdmin
    .from("tickets")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", ticket.id);

  const guild = await ensureGuild(ticket.guild_id);
  if (ticket.channel_id) {
    try {
      await sendMessage(ticket.channel_id, `🔒 Ticket closed by ${opts.closedBy}.`);
      await lockChannel(ticket.channel_id, ticket.guild_id);
    } catch (error) {
      console.error("close ticket channel failed", error);
    }
  }
  await log(guild, `🔒 Ticket #${ticket.ticket_number} closed by ${opts.closedBy}`);
  return ticket;
}

type Automation = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_value: string;
  action_type: string;
  action_value: string;
  run_count: number;
};

function matches(a: Automation, content: string, isFirst: boolean) {
  const value = a.trigger_value.toLowerCase().trim();
  const text = content.toLowerCase();
  switch (a.trigger_type) {
    case "ticket_created":
      return isFirst;
    case "every_message":
      return true;
    case "message_starts_with":
      return !!value && text.startsWith(value);
    case "message_contains":
    default:
      return !!value && value.split(",").some((v) => v.trim() && text.includes(v.trim()));
  }
}

export async function handleTicketMessage(opts: {
  guildId: string;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  isFirst?: boolean;
  source?: "user" | "staff";
}) {
  const { data: ticket } = await supabaseAdmin
    .from("tickets")
    .select("*")
    .eq("channel_id", opts.channelId)
    .eq("status", "open")
    .maybeSingle();
  if (!ticket) return { handled: false };

  await supabaseAdmin.from("ticket_messages").insert({
    ticket_id: ticket.id,
    author_id: opts.authorId,
    author_name: opts.authorName,
    source: opts.source ?? "user",
    content: opts.content,
  });

  if (opts.source === "staff") return { handled: true };

  const guild = await ensureGuild(opts.guildId);
  const { data: automations } = await supabaseAdmin
    .from("automations")
    .select("*")
    .eq("guild_id", opts.guildId)
    .eq("enabled", true)
    .order("priority", { ascending: false });

  let suppressAi = false;
  for (const automation of (automations ?? []) as Automation[]) {
    if (!matches(automation, opts.content, !!opts.isFirst)) continue;
    await supabaseAdmin
      .from("automations")
      .update({ run_count: automation.run_count + 1 })
      .eq("id", automation.id);

    switch (automation.action_type) {
      case "reply":
        await sendMessage(opts.channelId, automation.action_value);
        await supabaseAdmin.from("ticket_messages").insert({
          ticket_id: ticket.id,
          author_name: `Automation: ${automation.name}`,
          source: "automation",
          content: automation.action_value,
        });
        break;
      case "reply_and_stop_ai":
        await sendMessage(opts.channelId, automation.action_value);
        await supabaseAdmin.from("ticket_messages").insert({
          ticket_id: ticket.id,
          author_name: `Automation: ${automation.name}`,
          source: "automation",
          content: automation.action_value,
        });
        suppressAi = true;
        break;
      case "set_priority":
        await supabaseAdmin
          .from("tickets")
          .update({ priority: automation.action_value || "high" })
          .eq("id", ticket.id);
        break;
      case "set_category":
        await supabaseAdmin
          .from("tickets")
          .update({ category: automation.action_value || "general" })
          .eq("id", ticket.id);
        break;
      case "ping_staff":
        if (guild.staff_role_id) {
          await sendMessage(opts.channelId, `<@&${guild.staff_role_id}> ${automation.action_value || "staff attention needed"}`);
        }
        suppressAi = true;
        break;
      case "close_ticket":
        await closeTicket({ channelId: opts.channelId, closedBy: `automation "${automation.name}"` });
        return { handled: true };
      default:
        break;
    }
  }

  if (suppressAi) return { handled: true };

  const ai = await ensureAiSettings(opts.guildId);
  if (!ai.enabled) return { handled: true };
  if (opts.isFirst && !ai.auto_reply_first_message) return { handled: true };
  if (!opts.isFirst && !ai.auto_reply_all_messages) return { handled: true };

  const { data: history } = await supabaseAdmin
    .from("ticket_messages")
    .select("source, author_name, content")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true })
    .limit(30);

  const reply = await generateAiReply({
    model: ai.model,
    systemPrompt: ai.system_prompt,
    knowledgeBase: ai.knowledge_base,
    history: (history ?? []) as { source: string; author_name: string; content: string }[],
  });
  if (!reply) return { handled: true };

  await sendMessage(opts.channelId, reply);
  await supabaseAdmin.from("ticket_messages").insert({
    ticket_id: ticket.id,
    author_name: "Y2M AI",
    source: "ai",
    content: reply,
  });
  await supabaseAdmin.from("tickets").update({ ai_handled: true }).eq("id", ticket.id);

  return { handled: true };
}
