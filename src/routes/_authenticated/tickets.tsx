import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({
    meta: [
      { title: "Tickets — Y2M Tickets" },
      { name: "description", content: "Browse every Discord support ticket and its transcript." },
      { property: "og:title", content: "Tickets — Y2M Tickets" },
      { property: "og:description", content: "Browse every Discord support ticket." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TicketsPage,
});

type TicketRow = {
  id: string;
  ticket_number: number;
  subject: string;
  status: string;
  priority: string;
  category: string;
  ai_handled: boolean;
  discord_username: string;
  created_at: string;
};

const filters = ["all", "open", "closed"] as const;

function TicketsPage() {
  const [status, setStatus] = useState<(typeof filters)[number]>("all");
  const [search, setSearch] = useState("");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets", status],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select(
          "id, ticket_number, subject, status, priority, category, ai_handled, discord_username, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TicketRow[];
    },
  });

  const visible = (tickets ?? []).filter((t) =>
    `${t.ticket_number} ${t.subject} ${t.discord_username}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every conversation, stored for you.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {filters.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={status === f ? "secondary" : "ghost"}
              onClick={() => setStatus(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search by number, subject or member"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="panel overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : visible.length ? (
          <ul className="divide-y divide-border">
            {visible.map((t) => (
              <li key={t.id}>
                <Link
                  to="/tickets/$ticketId"
                  params={{ ticketId: t.id }}
                  className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-secondary/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      #{t.ticket_number} · {t.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.discord_username} · {t.category} · {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.ai_handled && (
                      <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs text-primary">
                        AI
                      </span>
                    )}
                    {t.priority !== "normal" && (
                      <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent">
                        {t.priority}
                      </span>
                    )}
                    <span
                      className={
                        t.status === "open"
                          ? "rounded-full bg-success/15 px-2.5 py-1 text-xs text-success"
                          : "rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                      }
                    >
                      {t.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">No tickets match this view.</p>
        )}
      </div>
    </div>
  );
}
