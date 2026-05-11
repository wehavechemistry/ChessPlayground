import { useCallback, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import type { PieceDropHandlerArgs, SquareHandlerArgs, PieceHandlerArgs } from "react-chessboard";
import type { Square } from "@/lib/chess-engine";
import type { GameState, GameActions } from "@/hooks/useChessGame";

interface ChessBoardProps {
  state: GameState;
  actions: GameActions;
  disabled?: boolean;
}

export function ChessBoard({ state, actions, disabled }: ChessBoardProps) {
  const {
    boardFen,
    boardLastMove,
    selectedSquare,
    legalMoves,
    isCheck,
    fen,
    turn,
    gameOver,
    mode,
    boardFlipped,
    isReviewing,
  } = state;
  const { makeMove, selectSquare } = actions;

  const isInteractive = !disabled && !isReviewing && mode === "play" && !gameOver.over;

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (boardLastMove) {
      styles[boardLastMove.from] = { backgroundColor: "rgba(255, 214, 10, 0.25)" };
      styles[boardLastMove.to] = { backgroundColor: "rgba(255, 214, 10, 0.35)" };
    }

    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: "rgba(100, 180, 255, 0.45)" };
    }

    for (const sq of legalMoves) {
      styles[sq] = {
        background: styles[sq]
          ? "radial-gradient(circle, rgba(100,200,100,0.6) 30%, transparent 31%) center/60% 60% no-repeat"
          : "radial-gradient(circle, rgba(100,200,100,0.5) 28%, transparent 30%) center/60% 60% no-repeat",
      };
    }

    if (isCheck && !isReviewing) {
      const kingSquare = findKingSquare(fen, turn);
      if (kingSquare) {
        styles[kingSquare] = { backgroundColor: "rgba(220, 50, 50, 0.55)" };
      }
    }

    return styles;
  }, [selectedSquare, legalMoves, boardLastMove, isCheck, fen, turn, isReviewing]);

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!isInteractive || !targetSquare) return false;
      return makeMove(sourceSquare as Square, targetSquare as Square);
    },
    [makeMove, isInteractive]
  );

  const onSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (!isInteractive) return;
      const sq = square as Square;
      if (selectedSquare) {
        if (selectedSquare === sq) { selectSquare(null); return; }
        if (legalMoves.includes(sq)) { makeMove(selectedSquare, sq); return; }
      }
      selectSquare(sq);
    },
    [selectedSquare, legalMoves, makeMove, selectSquare, isInteractive]
  );

  const onPieceDrag = useCallback(
    ({ square }: PieceHandlerArgs) => {
      if (isInteractive && square) selectSquare(square as Square);
    },
    [selectSquare, isInteractive]
  );

  return (
    <div className="w-full max-w-[560px] aspect-square relative">
      <Chessboard
        options={{
          position: boardFen,
          onPieceDrop,
          onSquareClick,
          onPieceDrag,
          squareStyles: customSquareStyles,
          boardOrientation: boardFlipped ? "black" : "white",
          allowDragging: isInteractive,
          boardStyle: {
            borderRadius: "6px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          },
          darkSquareStyle: { backgroundColor: "#5d8a6e" },
          lightSquareStyle: { backgroundColor: "#f0d9b5" },
          animationDurationInMs: 150,
        }}
      />
      {isReviewing && (
        <div className="absolute inset-0 rounded-[6px] pointer-events-none ring-2 ring-primary/40" />
      )}
    </div>
  );
}

function findKingSquare(fen: string, turn: "w" | "b"): Square | null {
  const pieceChar = turn === "w" ? "K" : "k";
  const board = fen.split(" ")[0];
  let file = 0;
  let rank = 7;
  for (const ch of board) {
    if (ch === "/") { rank--; file = 0; }
    else if (ch >= "1" && ch <= "8") { file += parseInt(ch); }
    else {
      if (ch === pieceChar) return (String.fromCharCode(97 + file) + (rank + 1)) as Square;
      file++;
    }
  }
  return null;
}
