import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, MessageSquareText, ShieldCheck, Workflow, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Y2M Tickets — AI Discord Ticket Support" },
      {
        name: "description",
        content:
          "Y2M Tickets runs your Discord support desk: instant AI answers, custom automations and an admin-only dashboard for every conversation.",
      },
      { property: "og:title", content: "Y2M Tickets — AI Discord Ticket Support" },
      {
        property: "og:description",
        content:
          "Instant AI answers, custom automations and an admin-only dashboard for your Discord support tickets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Bot,
    title: "AI that answers first",
    body: "Set the tone, the rules and the knowledge. Every ticket gets an instant, on-brand reply.",
  },
  {
    icon: Workflow,
    title: "Automations you control",
    body: "Keyword rules that reply, tag, escalate, ping staff or close a ticket on their own.",
  },
  {
    icon: MessageSquareText,
    title: "Every message, stored",
    body: "Full transcripts of each ticket, searchable and readable from the dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Admins only",
    body: "The dashboard is locked behind invite-only admin accounts. Members never see it.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">Y2M Tickets</span>
        </div>
        <Button asChild variant="secondary">
          <Link to="/auth">Admin sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 md:pt-20">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" /> Live Discord support, handled by AI
        </p>
        <h1 className="max-w-3xl text-4xl leading-tight font-bold md:text-6xl">
          Your Discord support desk,{" "}
          <span className="text-gradient">answered before you wake up</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Y2M Tickets opens ticket channels, replies with the AI personality you write, runs your
          automations, and keeps every conversation in one admin dashboard.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Open the dashboard</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
              Discord developer portal
            </a>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="panel p-6">
            <f.icon className="size-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Y2M Tickets
      </footer>
    </main>
  );
}
