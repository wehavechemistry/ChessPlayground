import { useState, useEffect, useRef, useCallback } from "react";
import { useChessGame } from "./useChessGame";
import type { MatchConfig, EngineLog } from "@/lib/engine-types";
import { DEFAULT_MATCH_CONFIG } from "@/lib/engine-types";
import { requestBotMove } from "@/lib/remote-engine";
import type { Square } from "@/lib/chess-engine";

export { type MatchConfig };

export function useMatchController() {
  const game = useChessGame();

  const [config, setConfig] = useState<MatchConfig>(DEFAULT_MATCH_CONFIG);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);
  const [engineLogs, setEngineLogs] = useState<EngineLog[]>([]);
  const [botTrigger, setBotTrigger] = useState(0);

  const isBotThinkingRef = useRef(false);
  const makeMoveRef = useRef(game.makeMove);
  makeMoveRef.current = game.makeMove;

  const configRef = useRef(config);
  configRef.current = config;

  const logIdRef = useRef(0);

  const addLog = useCallback((entry: Omit<EngineLog, "id" | "time">) => {
    const id = ++logIdRef.current;
    const time = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setEngineLogs((prev) => [...prev.slice(-99), { ...entry, id, time }]);
  }, []);

  useEffect(() => {
    if (game.gameOver.over) return;
    if (game.isReviewing) return;
    if (isBotThinkingRef.current) return;

    const currentConfig = configRef.current;
    const currentPlayer = game.turn === "w" ? currentConfig.white : currentConfig.black;
    if (currentPlayer !== "bot") return;

    const botFile =
      game.turn === "w" ? currentConfig.whiteBotFile : currentConfig.blackBotFile;
    if (!botFile) return;

    const timeMs =
      game.turn === "w" ? currentConfig.timeMsWhite : currentConfig.timeMsBlack;

    const side = game.turn;
    const sideName = side === "w" ? "White" : "Black";

    isBotThinkingRef.current = true;
    setIsBotThinking(true);
    setBotError(null);

    addLog({ side, type: "start", message: `${sideName} thinking (${botFile}, ${timeMs}ms)…` });

    const moves = game.moveHistory.map(
      (m) => m.from + m.to + (m.promotion ?? "")
    );

    requestBotMove({ fen: game.fen, moves, turn: game.turn, botFile, timeMs })
      .then((bestmove) => {
        if (!bestmove) {
          addLog({ side, type: "move", message: `${sideName} has no legal moves` });
          return;
        }
        const from = bestmove.slice(0, 2) as Square;
        const to = bestmove.slice(2, 4) as Square;
        const promotion = bestmove[4] || undefined;
        const ok = makeMoveRef.current(from, to, promotion);
        if (ok) {
          addLog({ side, type: "move", message: `${sideName} played ${bestmove}` });
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setBotError(msg);
        addLog({ side, type: "error", message: `ERROR: ${msg}` });
      })
      .finally(() => {
        isBotThinkingRef.current = false;
        setIsBotThinking(false);
        setBotTrigger((t) => t + 1);
      });
  }, [
    game.fen,
    game.turn,
    game.gameOver.over,
    game.isReviewing,
    game.syncEpoch,
    botTrigger,
    config.white,
    config.black,
    addLog,
  ]);

  return {
    game,
    config,
    setConfig,
    isBotThinking,
    botError,
    clearBotError: () => setBotError(null),
    engineLogs,
    clearEngineLogs: () => setEngineLogs([]),
  };
}
