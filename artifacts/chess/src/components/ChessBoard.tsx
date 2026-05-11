import { useCallback, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import type { Square } from "@/lib/chess-engine";
import type { GameState, GameActions } from "@/hooks/useChessGame";

interface ChessBoardProps {
  state: GameState;
  actions: GameActions;
}

export function ChessBoard({ state, actions }: ChessBoardProps) {
  const { fen, selectedSquare, legalMoves, lastMove, isCheck, gameOver, turn, mode, boardFlipped } = state;
  const { makeMove, selectSquare } = actions;

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: "rgba(255, 214, 10, 0.25)" };
      styles[lastMove.to] = { backgroundColor: "rgba(255, 214, 10, 0.35)" };
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

    if (isCheck) {
      const kingSquare = findKingSquare(fen, turn);
      if (kingSquare) {
        styles[kingSquare] = { backgroundColor: "rgba(220, 50, 50, 0.55)" };
      }
    }

    return styles;
  }, [selectedSquare, legalMoves, lastMove, isCheck, fen, turn]);

  const onPieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square): boolean => {
      if (mode === "editor") return false;
      if (gameOver.over) return false;
      return makeMove(sourceSquare, targetSquare);
    },
    [makeMove, mode, gameOver.over]
  );

  const onSquareClick = useCallback(
    (square: Square) => {
      if (mode === "editor") return;
      if (gameOver.over) return;

      if (selectedSquare) {
        if (selectedSquare === square) {
          selectSquare(null);
          return;
        }
        if (legalMoves.includes(square)) {
          makeMove(selectedSquare, square);
          return;
        }
      }

      selectSquare(square);
    },
    [selectedSquare, legalMoves, makeMove, selectSquare, mode, gameOver.over]
  );

  const onPieceDragBegin = useCallback(
    (_piece: string, square: Square) => {
      if (mode === "play") selectSquare(square);
    },
    [selectSquare, mode]
  );

  return (
    <div className="w-full max-w-[560px] aspect-square">
      <Chessboard
        position={fen}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        onPieceDragBegin={onPieceDragBegin}
        customSquareStyles={customSquareStyles}
        boardOrientation={boardFlipped ? "black" : "white"}
        arePiecesDraggable={mode === "play" && !gameOver.over}
        customBoardStyle={{
          borderRadius: "6px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
        customDarkSquareStyle={{ backgroundColor: "#5d8a6e" }}
        customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
        animationDuration={150}
      />
    </div>
  );
}

function findKingSquare(fen: string, turn: "w" | "b"): Square | null {
  const pieceChar = turn === "w" ? "K" : "k";
  const board = fen.split(" ")[0];
  let file = 0;
  let rank = 7;

  for (const ch of board) {
    if (ch === "/") {
      rank--;
      file = 0;
    } else if (ch >= "1" && ch <= "8") {
      file += parseInt(ch);
    } else {
      if (ch === pieceChar) {
        const sq = (String.fromCharCode(97 + file) + (rank + 1)) as Square;
        return sq;
      }
      file++;
    }
  }
  return null;
}
