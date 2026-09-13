import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, CircleCheck, Clock, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGuild } from "@/lib/use-guild";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Y2M Tickets" },
      { name: "description", content: "Ticket volume, AI activity and recent Discord tickets." },
      { property: "og:title", content: "Overview — Y2M Tickets" },
      { property: "og:description", content: "Ticket volume, AI activity and recent tickets." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

type TicketRow = {
  id: string;
  ticket_number: number;
  subject: string;
  status: string;
  priority: string;
  ai_handled: boolean;
  discord_username: string;
  created_at: string;
};

function DashboardPage() {
  const { data: guild } = useGuild();

  const { data: tickets } = useQuery({
    queryKey: ["tickets", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, ticket_number, subject, status, priority, ai_handled, discord_username, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as TicketRow[];
    },
  });

  const open = tickets?.filter((t) => t.status === "open").length ?? 0;
  const closed = tickets?.filter((t) => t.status === "closed").length ?? 0;
  const aiHandled = tickets?.filter((t) => t.ai_handled).length ?? 0;

  const stats = [
    { label: "Open tickets", value: open, icon: Ticket },
    { label: "Closed", value: closed, icon: CircleCheck },
    { label: "Answered by AI", value: aiHandled, icon: Bot },
    { label: "Recent total", value: tickets?.length ?? 0, icon: Clock },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {guild ? `Connected to ${guild.name}` : "No Discord server connected yet."}{" "}
          {!guild && (
            <Link to="/settings" className="text-primary underline-offset-4 hover:underline">
              Set it up
            </Link>
          )}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-5">
            <s.icon className="size-5 text-primary" />
            <p className="mt-3 text-3xl font-semibold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold">Recent tickets</h2>
          <Link to="/tickets" className="text-sm text-primary underline-offset-4 hover:underline">
            View all
          </Link>
        </div>
        {tickets?.length ? (
          <ul className="divide-y divide-border">
            {tickets.slice(0, 8).map((t) => (
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
                      {t.discord_username} · {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={
                      t.status === "open"
                        ? "rounded-full bg-success/15 px-2.5 py-1 text-xs text-success"
                        : "rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                    }
                  >
                    {t.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-muted-foreground">
            No tickets yet. Once the bot is live in your server, they show up here.
          </p>
        )}
      </section>
    </div>
  );
}
