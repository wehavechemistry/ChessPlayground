import { useState, useEffect, useRef } from "react";
import { useChessGame } from "./useChessGame";
import type { MatchConfig } from "@/lib/engine-types";
import { requestBotMove } from "@/lib/remote-engine";
import type { Square } from "@/lib/chess-engine";

export { type MatchConfig };

export function useMatchController() {
  const game = useChessGame();

  const [config, setConfig] = useState<MatchConfig>({
    white: "human",
    black: "human",
    whiteBotFile: "random_bot",
    blackBotFile: "random_bot",
  });
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);

  const isBotThinkingRef = useRef(false);
  const makeMoveRef = useRef(game.makeMove);
  makeMoveRef.current = game.makeMove;

  const configRef = useRef(config);
  configRef.current = config;

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

    isBotThinkingRef.current = true;
    setIsBotThinking(true);
    setBotError(null);

    const moves = game.moveHistory.map(
      (m) => m.from + m.to + (m.promotion ?? "")
    );

    requestBotMove({ fen: game.fen, moves, turn: game.turn, botFile })
      .then((bestmove) => {
        const from = bestmove.slice(0, 2) as Square;
        const to = bestmove.slice(2, 4) as Square;
        const promotion = bestmove[4] || undefined;
        makeMoveRef.current(from, to, promotion);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setBotError(msg);
      })
      .finally(() => {
        isBotThinkingRef.current = false;
        setIsBotThinking(false);
      });
  }, [game.fen, game.turn, game.gameOver.over, game.isReviewing]);

  return { game, config, setConfig, isBotThinking, botError, clearBotError: () => setBotError(null) };
}
