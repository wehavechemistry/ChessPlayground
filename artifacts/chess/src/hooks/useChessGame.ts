import { useState, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import type { Square, Move, PieceSymbol } from "@/lib/chess-engine";
import { getLegalMoves, isGameOver } from "@/lib/chess-engine";

export type GameMode = "play" | "editor";

export interface GameState {
  fen: string;
  boardFen: string;
  boardLastMove: { from: Square; to: Square } | null;
  moveHistory: Move[];
  selectedSquare: Square | null;
  legalMoves: Square[];
  lastMove: { from: Square; to: Square } | null;
  isCheck: boolean;
  gameOver: { over: boolean; reason: string };
  turn: "w" | "b";
  mode: GameMode;
  boardFlipped: boolean;
  isReviewing: boolean;
  reviewIndex: number | null;
  syncEpoch: number;
}

export interface GameActions {
  makeMove: (from: Square, to: Square, promotion?: string) => boolean;
  selectSquare: (square: Square | null) => void;
  resetGame: () => void;
  loadFen: (fen: string) => boolean;
  loadPgn: (pgn: string) => boolean;
  getCurrentFen: () => string;
  getPgn: () => string;
  flipBoard: () => void;
  setMode: (mode: GameMode) => void;
  putPiece: (square: Square, piece: { type: PieceSymbol; color: "w" | "b" } | null) => void;
  goToMove: (index: number) => void;
  goToFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  goToLive: () => void;
  setTurnToMove: (turn: "w" | "b") => void;
  clearBoard: () => void;
}

function buildPositionAt(
  history: Move[],
  index: number
): { fen: string; lastMove: { from: Square; to: Square } | null } {
  if (index < 0) {
    return { fen: new Chess().fen(), lastMove: null };
  }
  const chess = new Chess();
  for (let i = 0; i <= index && i < history.length; i++) {
    chess.move(history[i]);
  }
  const m = history[index];
  return {
    fen: chess.fen(),
    lastMove: m ? { from: m.from as Square, to: m.to as Square } : null,
  };
}

export function useChessGame(): GameState & GameActions {
  const chessRef = useRef(new Chess());
  const reviewIndexRef = useRef<number | null>(null);

  const [fen, setFenState] = useState(() => chessRef.current.fen());
  const [boardFen, setBoardFen] = useState(() => chessRef.current.fen());
  const [boardLastMove, setBoardLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [mode, setModeState] = useState<GameMode>("play");
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [syncEpoch, setSyncEpoch] = useState(0);

  const sync = useCallback(() => {
    const liveFen = chessRef.current.fen();
    const liveHistory = [...chessRef.current.history({ verbose: true })];
    setFenState(liveFen);
    setMoveHistory(liveHistory);
    if (reviewIndexRef.current === null) {
      setBoardFen(liveFen);
      const prev = liveHistory[liveHistory.length - 1];
      setBoardLastMove(prev ? { from: prev.from as Square, to: prev.to as Square } : null);
    }
  }, []);

  const goToMove = useCallback((index: number) => {
    const history = chessRef.current.history({ verbose: true });
    if (history.length === 0) return;
    const clamped = Math.max(-1, Math.min(index, history.length - 1));
    reviewIndexRef.current = clamped;
    setReviewIndex(clamped);
    setSelectedSquare(null);
    setLegalMoves([]);
    const { fen: reviewFen, lastMove: reviewLast } = buildPositionAt(history, clamped);
    setBoardFen(reviewFen);
    setBoardLastMove(reviewLast);
  }, []);

  const goToLive = useCallback(() => {
    reviewIndexRef.current = null;
    setReviewIndex(null);
    setBoardFen(chessRef.current.fen());
    const history = chessRef.current.history({ verbose: true });
    const prev = history[history.length - 1];
    setBoardLastMove(prev ? { from: prev.from as Square, to: prev.to as Square } : null);
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const goToFirst = useCallback(() => {
    const history = chessRef.current.history({ verbose: true });
    if (history.length === 0) return;
    goToMove(-1);
  }, [goToMove]);

  const goPrev = useCallback(() => {
    const ri = reviewIndexRef.current;
    const history = chessRef.current.history({ verbose: true });
    if (history.length === 0) return;
    if (ri === null) {
      goToMove(history.length - 2);
    } else if (ri > -1) {
      goToMove(ri - 1);
    }
  }, [goToMove]);

  const goNext = useCallback(() => {
    const ri = reviewIndexRef.current;
    const history = chessRef.current.history({ verbose: true });
    if (ri === null) return;
    if (ri >= history.length - 1) {
      goToLive();
    } else {
      goToMove(ri + 1);
    }
  }, [goToMove, goToLive]);

  const selectSquare = useCallback((square: Square | null) => {
    if (!square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }
    setSelectedSquare(square);
    setLegalMoves(getLegalMoves(chessRef.current, square));
  }, []);

  const makeMove = useCallback(
    (from: Square, to: Square, promotion = "q"): boolean => {
      if (reviewIndexRef.current !== null) return false;
      try {
        const result = chessRef.current.move({ from, to, promotion });
        if (result) {
          setLastMove({ from, to });
          setSelectedSquare(null);
          setLegalMoves([]);
          sync();
          return true;
        }
      } catch {}
      return false;
    },
    [sync]
  );

  const resetGame = useCallback(() => {
    chessRef.current.reset();
    reviewIndexRef.current = null;
    setReviewIndex(null);
    setLastMove(null);
    setSelectedSquare(null);
    setLegalMoves([]);
    setSyncEpoch((e) => e + 1);
    sync();
  }, [sync]);

  const loadFen = useCallback(
    (newFen: string): boolean => {
      try {
        chessRef.current.load(newFen);
        reviewIndexRef.current = null;
        setReviewIndex(null);
        setLastMove(null);
        setSelectedSquare(null);
        setLegalMoves([]);
        setSyncEpoch((e) => e + 1);
        sync();
        return true;
      } catch {
        return false;
      }
    },
    [sync]
  );

  const loadPgn = useCallback(
    (pgn: string): boolean => {
      try {
        chessRef.current.loadPgn(pgn);
        reviewIndexRef.current = null;
        setReviewIndex(null);
        const history = chessRef.current.history({ verbose: true });
        const prev = history[history.length - 1];
        setLastMove(prev ? { from: prev.from as Square, to: prev.to as Square } : null);
        setSelectedSquare(null);
        setLegalMoves([]);
        setSyncEpoch((e) => e + 1);
        sync();
        return true;
      } catch {
        return false;
      }
    },
    [sync]
  );

  const getCurrentFen = useCallback(() => chessRef.current.fen(), []);
  const getPgn = useCallback(() => chessRef.current.pgn(), []);

  const flipBoard = useCallback(() => setBoardFlipped((f) => !f), []);

  const setMode = useCallback((m: GameMode) => {
    setModeState(m);
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const putPiece = useCallback(
    (square: Square, piece: { type: PieceSymbol; color: "w" | "b" } | null) => {
      if (piece === null) {
        chessRef.current.remove(square);
      } else {
        chessRef.current.put(piece, square);
      }
      sync();
    },
    [sync]
  );

  const setTurnToMove = useCallback(
    (turn: "w" | "b") => {
      const parts = chessRef.current.fen().split(" ");
      parts[1] = turn;
      try {
        chessRef.current.load(parts.join(" "));
        sync();
      } catch { /* ignore invalid position */ }
    },
    [sync]
  );

  const clearBoard = useCallback(() => {
    chessRef.current.clear();
    sync();
  }, [sync]);

  const chess = chessRef.current;

  return {
    fen,
    boardFen,
    boardLastMove,
    moveHistory,
    selectedSquare,
    legalMoves,
    lastMove,
    isCheck: chess.inCheck(),
    gameOver: isGameOver(chess),
    turn: chess.turn(),
    mode,
    boardFlipped,
    isReviewing: reviewIndex !== null,
    reviewIndex,
    syncEpoch,
    makeMove,
    selectSquare,
    resetGame,
    loadFen,
    loadPgn,
    getCurrentFen,
    getPgn,
    flipBoard,
    setMode,
    putPiece,
    goToMove,
    goToFirst,
    goPrev,
    goNext,
    goToLive,
    setTurnToMove,
    clearBoard,
  };
}
