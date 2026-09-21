import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGuild, type GuildRow } from "@/lib/use-guild";
import { getBotStatus, registerCommands, postPanel } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Discord setup — Y2M Tickets" },
      {
        name: "description",
        content: "Connect your Discord server, choose the ticket category, staff role and log channel.",
      },
      { property: "og:title", content: "Discord setup — Y2M Tickets" },
      { property: "og:description", content: "Connect your Discord server to Y2M Tickets." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

type Form = {
  id: string | null;
  guild_id: string;
  name: string;
  ticket_category_id: string;
  staff_role_id: string;
  log_channel_id: string;
  panel_channel_id: string;
  welcome_message: string;
};

const empty: Form = {
  id: null,
  guild_id: "",
  name: "",
  ticket_category_id: "",
  staff_role_id: "",
  log_channel_id: "",
  panel_channel_id: "",
  welcome_message:
    "Hi {user}, thanks for opening a ticket! Tell us what you need and our assistant will help right away.",
};

function fromRow(row: GuildRow): Form {
  return {
    id: row.id,
    guild_id: row.guild_id,
    name: row.name ?? "",
    ticket_category_id: row.ticket_category_id ?? "",
    staff_role_id: row.staff_role_id ?? "",
    log_channel_id: row.log_channel_id ?? "",
    panel_channel_id: row.panel_channel_id ?? "",
    welcome_message: row.welcome_message ?? empty.welcome_message,
  };
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="size-4 text-primary" />
      ) : (
        <XCircle className="size-4 text-destructive" />
      )}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function SettingsPage() {
  const { data: guild } = useGuild();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(empty);

  useEffect(() => {
    if (guild) setForm(fromRow(guild));
  }, [guild]);

  const { data: status } = useQuery({
    queryKey: ["bot-status"],
    queryFn: () => getBotStatus({ data: undefined }),
  });

  const save = useMutation({
    mutationFn: async (values: Form) => {
      const payload = {
        guild_id: values.guild_id.trim(),
        name: values.name.trim() || "My Discord server",
        ticket_category_id: values.ticket_category_id.trim() || null,
        staff_role_id: values.staff_role_id.trim() || null,
        log_channel_id: values.log_channel_id.trim() || null,
        panel_channel_id: values.panel_channel_id.trim() || null,
        welcome_message: values.welcome_message,
      };
      if (!payload.guild_id) throw new Error("Server ID is required");
      if (values.id) {
        const { error } = await supabase.from("guilds").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("guilds").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Discord setup saved");
      queryClient.invalidateQueries({ queryKey: ["guild"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  const register = useMutation({
    mutationFn: () => registerCommands({ data: { guildId: form.guild_id.trim() } }),
    onSuccess: () => toast.success("Commands added to your server"),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not add the commands"),
  });

  const panel = useMutation({
    mutationFn: () => postPanel({ data: { channelId: form.panel_channel_id.trim() } }),
    onSuccess: () => toast.success("Ticket panel posted"),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not post the panel"),
  });

  const field = (
    key: keyof Form,
    label: string,
    hint: string,
    placeholder = "",
  ) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={form[key] as string}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Discord setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn on Developer Mode in Discord, then right-click a server, category, role or channel and
          choose “Copy ID” to fill these in.
        </p>
      </header>

      <section className="panel space-y-3 p-6">
        <h2 className="font-semibold">Bot connection</h2>
        <Status ok={!!status?.hasToken} label="Bot token saved" />
        <Status ok={!!status?.hasPublicKey} label="Signature key saved" />
        <Status ok={!!status?.hasAppId} label="Application ID saved" />
        <Status ok={!!status?.hasAiKey} label="AI access ready" />
        {status?.applicationId ? (
          <p className="pt-2 text-xs text-muted-foreground">
            Invite the bot with{" "}
            <a
              className="text-primary underline-offset-4 hover:underline"
              href={`https://discord.com/oauth2/authorize?client_id=${status.applicationId}&permissions=292057785360&scope=bot%20applications.commands`}
              target="_blank"
              rel="noreferrer"
            >
              this link
            </a>
            , and set your Interactions Endpoint URL to{" "}
            <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/public/discord/interactions</code>
          </p>
        ) : null}
      </section>

      <section className="panel space-y-5 p-6">
        <h2 className="font-semibold">Your server</h2>
        {field("guild_id", "Server ID", "Right-click your server name → Copy Server ID.", "123456789012345678")}
        {field("name", "Server name", "Only used to label things in this dashboard.")}
        {field(
          "ticket_category_id",
          "Ticket category ID",
          "New ticket channels are created inside this category. Leave empty for the top level.",
        )}
        {field("staff_role_id", "Staff role ID", "This role can see and reply in every ticket.")}
        {field("log_channel_id", "Log channel ID", "Ticket opened/closed notices are posted here.")}
        {field("panel_channel_id", "Panel channel ID", "Where the “Open a ticket” button is posted.")}

        <div className="space-y-2">
          <Label htmlFor="welcome">Welcome message</Label>
          <Textarea
            id="welcome"
            rows={3}
            value={form.welcome_message}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Use {"{user}"} to mention the person who opened the ticket.
          </p>
        </div>

        <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save setup"}
        </Button>
      </section>

      <section className="panel space-y-4 p-6">
        <h2 className="font-semibold">Finish up</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={!form.guild_id.trim() || register.isPending}
            onClick={() => register.mutate()}
          >
            {register.isPending ? "Adding…" : "Add /ticket, /close, /panel"}
          </Button>
          <Button
            variant="secondary"
            disabled={!form.panel_channel_id.trim() || panel.isPending}
            onClick={() => panel.mutate()}
          >
            {panel.isPending ? "Posting…" : "Post the ticket panel"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Save your setup first — both actions use the IDs above.
        </p>
      </section>
    </div>
  );
}
