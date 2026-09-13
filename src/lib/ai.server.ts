type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function generateAiReply(opts: {
  model: string;
  systemPrompt: string;
  knowledgeBase: string;
  history: { source: string; author_name: string; content: string }[];
}): Promise<string | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    console.error("LOVABLE_API_KEY missing — cannot generate AI reply");
    return null;
  }

  const system = [
    opts.systemPrompt,
    opts.knowledgeBase.trim()
      ? `\n\nKnowledge base you must use when answering:\n${opts.knowledgeBase.trim()}`
      : "",
    "\n\nKeep replies under 1200 characters. Never invent policies or facts that are not in the knowledge base.",
  ].join("");

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...opts.history.slice(-20).map((m) => ({
      role: (m.source === "ai" || m.source === "staff" ? "assistant" : "user") as
        | "assistant"
        | "user",
      content: m.source === "user" ? `${m.author_name}: ${m.content}` : m.content,
    })),
  ];

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: opts.model, messages }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`AI gateway ${res.status}: ${body}`);
    if (res.status === 429) return "I'm getting a lot of requests right now — a staff member will follow up shortly.";
    if (res.status === 402) return null;
    return null;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? text.slice(0, 1800) : null;
}
