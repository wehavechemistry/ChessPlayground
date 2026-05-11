export async function requestBotMove(args: {
  fen: string;
  moves: string[];
  turn: "w" | "b";
  botFile: string;
  timeMs?: number;
}): Promise<string> {
  const res = await fetch("/api/engine/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fen: args.fen,
      moves: args.moves,
      turn: args.turn,
      botFile: args.botFile,
      timeMs: args.timeMs ?? 2000,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Engine error: ${text}`);
  }
  const data = (await res.json()) as { bestmove?: string; error?: string };
  if (!data.bestmove) throw new Error(data.error ?? "No bestmove in response");
  return data.bestmove;
}
