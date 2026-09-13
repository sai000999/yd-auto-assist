import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Bot, Send, Workflow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { closeTicketFromDashboard, sendStaffReply } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tickets/$ticketId")({
  head: () => ({
    meta: [
      { title: "Ticket — Y2M Tickets" },
      { name: "description", content: "Read the full ticket transcript and reply from the dashboard." },
      { property: "og:title", content: "Ticket — Y2M Tickets" },
      { property: "og:description", content: "Read the full ticket transcript and reply." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TicketDetail,
});

type Message = {
  id: string;
  author_name: string;
  source: string;
  content: string;
  created_at: string;
};

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");

  const replyFn = useServerFn(sendStaffReply);
  const closeFn = useServerFn(closeTicketFromDashboard);

  const { data: ticket } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tickets").select("*").eq("id", ticketId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("id, author_name, source, content, created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => replyFn({ data: { ticketId, content } }),
    onSuccess: () => {
      setReply("");
      toast.success("Reply sent to Discord");
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send"),
  });

  const closeMutation = useMutation({
    mutationFn: async () => closeFn({ data: { ticketId } }),
    onSuccess: () => {
      toast.success("Ticket closed");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not close"),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/tickets"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All tickets
      </Link>

      <header className="panel flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <h1 className="text-2xl font-bold">
            #{ticket?.ticket_number} · {ticket?.subject}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ticket?.discord_username} · {ticket?.category} · priority {ticket?.priority}
          </p>
        </div>
        {ticket?.status === "open" ? (
          <Button variant="destructive" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
            Close ticket
          </Button>
        ) : (
          <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">Closed</span>
        )}
      </header>

      <section className="panel space-y-3 p-5">
        {messages?.length ? (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-xl border border-border p-4",
                m.source === "ai" && "border-primary/40 bg-primary/5",
                m.source === "automation" && "border-accent/40 bg-accent/5",
                m.source === "staff" && "bg-secondary/60",
              )}
            >
              <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                {m.source === "ai" && <Bot className="size-3.5 text-primary" />}
                {m.source === "automation" && <Workflow className="size-3.5 text-accent" />}
                <span className="font-medium text-foreground">{m.author_name}</span>
                {new Date(m.created_at).toLocaleString()}
              </p>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No messages recorded yet.</p>
        )}
      </section>

      {ticket?.status === "open" && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-semibold">Reply as staff</h2>
          <Textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="This message is posted straight into the Discord ticket channel."
          />
          <Button
            onClick={() => sendMutation.mutate(reply)}
            disabled={!reply.trim() || sendMutation.isPending}
            className="gap-2"
          >
            <Send className="size-4" /> Send to Discord
          </Button>
        </section>
      )}
    </div>
  );
}
