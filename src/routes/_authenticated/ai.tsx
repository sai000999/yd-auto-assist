import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useGuild } from "@/lib/use-guild";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI replies — Y2M Tickets" },
      { name: "description", content: "Choose the AI personality, knowledge and reply behaviour." },
      { property: "og:title", content: "AI replies — Y2M Tickets" },
      { property: "og:description", content: "Choose the AI personality and knowledge." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AiPage,
});


type AiRow = {
  id: string;
  guild_id: string;
  enabled: boolean;
  model: string;
  system_prompt: string;
  knowledge_base: string;
  auto_reply_first_message: boolean;
  auto_reply_all_messages: boolean;
};

function AiPage() {
  const { data: guild } = useGuild();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AiRow | null>(null);

  const { data } = useQuery({
    enabled: !!guild,
    queryKey: ["ai-settings", guild?.guild_id],
    queryFn: async () => {
      const { data: existing } = await supabase
        .from("ai_settings")
        .select("*")
        .eq("guild_id", guild!.guild_id)
        .maybeSingle();
      if (existing) return existing as AiRow;
      const { data: created, error } = await supabase
        .from("ai_settings")
        .insert({ guild_id: guild!.guild_id })
        .select("*")
        .single();
      if (error) throw error;
      return created as AiRow;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (values: AiRow) => {
      const { error } = await supabase
        .from("ai_settings")
        .update({
          enabled: values.enabled,
          model: values.model,
          system_prompt: values.system_prompt,
          knowledge_base: values.knowledge_base,
          auto_reply_first_message: values.auto_reply_first_message,
          auto_reply_all_messages: values.auto_reply_all_messages,
        })
        .eq("id", values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("AI settings saved");
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  if (!guild) {
    return (
      <div className="panel mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold">Connect your Discord server first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your server in{" "}
          <Link to="/settings" className="text-primary underline-offset-4 hover:underline">
            Discord setup
          </Link>
          , then come back to write your AI's personality.
        </p>
      </div>
    );
  }

  if (!form) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">AI replies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is exactly what your assistant knows and how it speaks in every ticket.
        </p>
      </header>

      <section className="panel space-y-5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>AI replies turned on</Label>
            <p className="text-sm text-muted-foreground">Turn this off to make tickets staff-only.</p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(enabled) => setForm({ ...form, enabled })}
          />
        </div>


        <div className="space-y-2">
          <Label htmlFor="prompt">Personality & rules</Label>
          <Textarea
            id="prompt"
            rows={6}
            value={form.system_prompt}
            onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kb">Knowledge the AI can use</Label>
          <Textarea
            id="kb"
            rows={10}
            placeholder="Prices, rules, refund policy, common fixes, links…"
            value={form.knowledge_base}
            onChange={(e) => setForm({ ...form, knowledge_base: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            The AI is told to stick to this and never invent answers.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label>Answer the first message in a ticket</Label>
          <Switch
            checked={form.auto_reply_first_message}
            onCheckedChange={(v) => setForm({ ...form, auto_reply_first_message: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label>Keep answering follow-up messages</Label>
          <Switch
            checked={form.auto_reply_all_messages}
            onCheckedChange={(v) => setForm({ ...form, auto_reply_all_messages: v })}
          />
        </div>

        <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save AI settings"}
        </Button>
      </section>
    </div>
  );
}
