import { useState, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import type { Square, Move, PieceSymbol } from "@/lib/chess-engine";
import { getLegalMoves, isGameOver } from "@/lib/chess-engine";

export type GameMode = "play" | "editor";

export interface GameState {
  fen: string;
  moveHistory: Move[];
  selectedSquare: Square | null;
  legalMoves: Square[];
  lastMove: { from: Square; to: Square } | null;
  isCheck: boolean;
  gameOver: { over: boolean; reason: string };
  turn: "w" | "b";
  mode: GameMode;
  boardFlipped: boolean;
}

export interface GameActions {
  makeMove: (from: Square, to: Square, promotion?: string) => boolean;
  selectSquare: (square: Square | null) => void;
  resetGame: () => void;
  loadFen: (fen: string) => boolean;
  loadPgn: (pgn: string) => boolean;
  getCurrentFen: () => string;
  getPgn: () => string;
  undoMove: () => void;
  flipBoard: () => void;
  setMode: (mode: GameMode) => void;
  putPiece: (square: Square, piece: { type: PieceSymbol; color: "w" | "b" } | null) => void;
}

export function useChessGame(): GameState & GameActions {
  const chessRef = useRef(new Chess());
  const [fen, setFenState] = useState(() => chessRef.current.fen());
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [mode, setModeState] = useState<GameMode>("play");

  const sync = useCallback(() => {
    setFenState(chessRef.current.fen());
    setMoveHistory([...chessRef.current.history({ verbose: true })]);
  }, []);

  const selectSquare = useCallback(
    (square: Square | null) => {
      if (!square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
      setSelectedSquare(square);
      setLegalMoves(getLegalMoves(chessRef.current, square));
    },
    []
  );

  const makeMove = useCallback(
    (from: Square, to: Square, promotion = "q"): boolean => {
      try {
        const result = chessRef.current.move({ from, to, promotion });
        if (result) {
          setLastMove({ from, to });
          setSelectedSquare(null);
          setLegalMoves([]);
          sync();
          return true;
        }
      } catch {
      }
      return false;
    },
    [sync]
  );

  const resetGame = useCallback(() => {
    chessRef.current.reset();
    setLastMove(null);
    setSelectedSquare(null);
    setLegalMoves([]);
    sync();
  }, [sync]);

  const loadFen = useCallback(
    (newFen: string): boolean => {
      try {
        chessRef.current.load(newFen);
        setLastMove(null);
        setSelectedSquare(null);
        setLegalMoves([]);
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
        const history = chessRef.current.history({ verbose: true });
        const prev = history[history.length - 1];
        setLastMove(prev ? { from: prev.from as Square, to: prev.to as Square } : null);
        setSelectedSquare(null);
        setLegalMoves([]);
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

  const undoMove = useCallback(() => {
    chessRef.current.undo();
    setSelectedSquare(null);
    setLegalMoves([]);
    const history = chessRef.current.history({ verbose: true });
    const prev = history[history.length - 1];
    setLastMove(prev ? { from: prev.from as Square, to: prev.to as Square } : null);
    sync();
  }, [sync]);

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

  const chess = chessRef.current;

  return {
    fen,
    moveHistory,
    selectedSquare,
    legalMoves,
    lastMove,
    isCheck: chess.inCheck(),
    gameOver: isGameOver(chess),
    turn: chess.turn(),
    mode,
    boardFlipped,
    makeMove,
    selectSquare,
    resetGame,
    loadFen,
    loadPgn,
    getCurrentFen,
    getPgn,
    undoMove,
    flipBoard,
    setMode,
    putPiece,
  };
}
