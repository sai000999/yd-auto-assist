import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGuild } from "@/lib/use-guild";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({
    meta: [
      { title: "Automations — Y2M Tickets" },
      { name: "description", content: "Rules that reply, tag, escalate or close tickets on their own." },
      { property: "og:title", content: "Automations — Y2M Tickets" },
      { property: "og:description", content: "Rules that handle tickets automatically." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AutomationsPage,
});

type Automation = {
  id: string;
  guild_id: string;
  name: string;
  enabled: boolean;
  trigger_type: string;
  trigger_value: string;
  action_type: string;
  action_value: string;
  priority: number;
  run_count: number;
};

const TRIGGERS = [
  { value: "message_contains", label: "Message contains (comma-separated words)" },
  { value: "message_starts_with", label: "Message starts with" },
  { value: "ticket_created", label: "A ticket is opened" },
  { value: "every_message", label: "Every message" },
];

const ACTIONS = [
  { value: "reply", label: "Send a reply" },
  { value: "reply_and_stop_ai", label: "Send a reply and skip the AI" },
  { value: "ping_staff", label: "Ping the staff role" },
  { value: "set_priority", label: "Set priority (low / normal / high / urgent)" },
  { value: "set_category", label: "Set category" },
  { value: "close_ticket", label: "Close the ticket" },
];

function AutomationsPage() {
  const { data: guild } = useGuild();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, Automation>>({});

  const { data: automations } = useQuery({
    enabled: !!guild,
    queryKey: ["automations", guild?.guild_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automations")
        .select("*")
        .eq("guild_id", guild!.guild_id)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Automation[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("automations").insert({
        guild_id: guild!.guild_id,
        name: "New automation",
        trigger_type: "message_contains",
        trigger_value: "refund, money back",
        action_type: "reply",
        action_value: "Our refund policy is handled by staff — someone will be with you shortly.",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create"),
  });

  const save = useMutation({
    mutationFn: async (a: Automation) => {
      const { error } = await supabase
        .from("automations")
        .update({
          name: a.name,
          enabled: a.enabled,
          trigger_type: a.trigger_type,
          trigger_value: a.trigger_value,
          action_type: a.action_type,
          action_value: a.action_value,
          priority: a.priority,
        })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Automation saved");
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });

  if (!guild) {
    return (
      <div className="panel mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold">Connect your Discord server first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your server in{" "}
          <Link to="/settings" className="text-primary underline-offset-4 hover:underline">
            Discord setup
          </Link>{" "}
          to start building rules.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Automations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rules run top to bottom by priority, before the AI answers.
          </p>
        </div>
        <Button onClick={() => create.mutate()} className="gap-2">
          <Plus className="size-4" /> New automation
        </Button>
      </header>

      <div className="space-y-4">
        {automations?.length ? (
          automations.map((row) => {
            const a = draft[row.id] ?? row;
            const update = (patch: Partial<Automation>) =>
              setDraft({ ...draft, [row.id]: { ...a, ...patch } });
            return (
              <div key={row.id} className="panel space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <Input
                    value={a.name}
                    onChange={(e) => update({ name: e.target.value })}
                    className="font-medium"
                  />
                  <Switch checked={a.enabled} onCheckedChange={(v) => update({ enabled: v })} />
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(row.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>When</Label>
                    <Select
                      value={a.trigger_type}
                      onValueChange={(v) => update({ trigger_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGERS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(a.trigger_type === "message_contains" ||
                      a.trigger_type === "message_starts_with") && (
                      <Input
                        value={a.trigger_value}
                        onChange={(e) => update({ trigger_value: e.target.value })}
                        placeholder="refund, money back"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Then</Label>
                    <Select value={a.action_type} onValueChange={(v) => update({ action_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {a.action_type !== "close_ticket" && (
                      <Textarea
                        rows={2}
                        value={a.action_value}
                        onChange={(e) => update({ action_value: e.target.value })}
                        placeholder={
                          a.action_type === "set_priority"
                            ? "high"
                            : a.action_type === "set_category"
                              ? "billing"
                              : "Message to send"
                        }
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <Input
                      type="number"
                      value={a.priority}
                      onChange={(e) => update({ priority: Number(e.target.value) })}
                      className="w-20"
                    />
                    <span className="text-xs text-muted-foreground">ran {row.run_count}×</span>
                  </div>
                  <Button size="sm" onClick={() => save.mutate(a)} disabled={save.isPending}>
                    Save
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="panel p-6 text-sm text-muted-foreground">
            No automations yet. Create one to reply instantly to common questions.
          </div>
        )}
      </div>
    </div>
  );
}
