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
    const data = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error ?? `Engine HTTP ${res.status}`);
  }
  const data = (await res.json()) as { bestmove?: string; error?: string };
  if (data.bestmove == null) throw new Error(data.error ?? "No bestmove in response");
  return data.bestmove;
}
