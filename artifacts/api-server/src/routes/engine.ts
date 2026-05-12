import { Router } from "express";
import { Chess } from "chess.js";
import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";

const router = Router();

router.post("/move", async (req, res) => {
  const { fen, moves, turn, timeMs = 1000, botFile } = req.body as {
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
    res.status(400).json({ error: "Invalid request body — required: fen (string), moves (array), turn ('w'|'b'), botFile (string)" });
    return;
  }

  const safeName = botFile.replace(/\.py$/, "");
  if (!safeName || /[/\\.]/.test(safeName)) {
    res.status(400).json({ error: `Invalid bot file name: "${botFile}"` });
    return;
  }

  const botsDir = path.join(process.cwd(), "bots");
  const fileName = botFile.endsWith(".py") ? botFile : `${botFile}.py`;
  const botPath = path.join(botsDir, fileName);

  if (!existsSync(botPath)) {
    res.status(404).json({
      error: `Bot file not found: "${fileName}". Place your .py file in artifacts/api-server/bots/.`,
    });
    return;
  }

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    res.status(400).json({ error: `Invalid FEN: "${fen}"` });
    return;
  }

  const legalMoves = chess
    .moves({ verbose: true })
    .map((m) => m.from + m.to + (m.promotion ?? ""));

  // Provide both `turn` ("w"/"b") and `color` ("white"/"black") so bots
  // have an unambiguous, human-readable field to check which side they are.
  const color = turn === "w" ? "white" : "black";

  const payload = JSON.stringify({
    fen,
    moves,
    legal_moves: legalMoves,
    turn,       // "w" or "b"  — matches chess.js / python-chess board.turn
    color,      // "white" or "black"  — unambiguous human-readable alias
    time_ms: timeMs,
  });

  try {
    const bestmove = await runBot(botPath, payload, timeMs + 5000);

    if (bestmove === "") {
      res.json({ bestmove: "" });
      return;
    }

    if (!legalMoves.includes(bestmove)) {
      const sample = legalMoves.slice(0, 5).join(", ");
      const more = legalMoves.length > 5 ? `… (${legalMoves.length} total)` : "";
      req.log.warn({ bestmove, botFile, fen }, "Bot returned illegal move");
      res.status(422).json({
        error: `Bot returned illegal move "${bestmove}". Legal: ${sample}${more}`,
      });
      return;
    }

    res.json({ bestmove });
  } catch (err) {
    req.log.error({ err, botFile }, "Bot execution failed");
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
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

    const proc = spawn("python3", [botPath], { stdio: ["pipe", "pipe", "pipe"] });
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
        const stderrSnip = stderr.slice(0, 500).trim();
        const detail = stderrSnip ? `\n${stderrSnip}` : "";
        settle(() => reject(new Error(`Bot exited with code ${code}${detail}`)));
        return;
      }
      try {
        const trimmed = stdout.trim();
        if (!trimmed) {
          settle(() => reject(new Error("Bot produced no output")));
          return;
        }
        // Take only the last line — some bots may print debug lines before the JSON
        const lastLine = trimmed.split("\n").pop()!.trim();
        const result = JSON.parse(lastLine) as { bestmove?: string };
        if (result.bestmove == null) {
          settle(() => reject(new Error("Bot output missing 'bestmove' field")));
          return;
        }
        settle(() => resolve(result.bestmove!));
      } catch {
        settle(() =>
          reject(new Error(`Bot output is not valid JSON: ${stdout.slice(0, 200)}`))
        );
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
