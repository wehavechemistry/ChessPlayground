import { Router } from "express";
import { Chess } from "chess.js";
import { spawn } from "child_process";
import path from "path";

const router = Router();

router.post("/move", async (req, res) => {
  const { fen, moves, turn, timeMs = 2000, botFile } = req.body as {
    fen?: string;
    moves?: string[];
    turn?: "w" | "b";
    timeMs?: number;
    botFile?: string;
  };

  if (
    typeof fen !== "string" ||
    !Array.isArray(moves) ||
    (turn !== "w" && turn !== "b") ||
    typeof botFile !== "string"
  ) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  if (!botFile || /[/\\.]/.test(botFile.replace(/\.py$/, ""))) {
    res.status(400).json({ error: "Invalid bot file name" });
    return;
  }

  const chess = new Chess(fen);
  const legalMoves = chess
    .moves({ verbose: true })
    .map((m) => m.from + m.to + (m.promotion ?? ""));

  const payload = JSON.stringify({
    fen,
    moves,
    legal_moves: legalMoves,
    turn,
    time_ms: timeMs,
  });

  const botsDir = path.join(process.cwd(), "bots");
  const fileName = botFile.endsWith(".py") ? botFile : `${botFile}.py`;
  const botPath = path.join(botsDir, fileName);

  try {
    const bestmove = await runBot(botPath, payload, timeMs + 3000);
    res.json({ bestmove });
  } catch (err) {
    req.log.error({ err, botFile }, "Bot execution failed");
    res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
  }
});

function runBot(botPath: string, payload: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const proc = spawn("python3", [botPath]);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      settle(() => reject(new Error(`Bot timed out after ${timeoutMs}ms`)));
    }, timeoutMs);

    proc.on("close", (code, signal) => {
      clearTimeout(timer);
      if (signal) {
        settle(() => reject(new Error(`Bot killed by signal ${signal}`)));
        return;
      }
      if (code !== 0) {
        settle(() => reject(new Error(`Bot exited ${code}: ${stderr.slice(0, 300)}`)));
        return;
      }
      try {
        const result = JSON.parse(stdout.trim()) as { bestmove?: string };
        if (!result.bestmove) throw new Error("No bestmove field in bot output");
        settle(() => resolve(result.bestmove!));
      } catch {
        settle(() => reject(new Error(`Invalid bot output: ${stdout.slice(0, 100)}`)));
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      settle(() => reject(err));
    });

    proc.stdin.write(payload + "\n");
    proc.stdin.end();
  });
}

export default router;
