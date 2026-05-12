import { useCallback, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { Arrow } from "react-chessboard";
import type { PieceDropHandlerArgs, SquareHandlerArgs, PieceHandlerArgs } from "react-chessboard";
import type { Square, PieceSymbol } from "@/lib/chess-engine";
import type { GameState, GameActions } from "@/hooks/useChessGame";

interface EditorConfig {
  piece: { type: PieceSymbol; color: "w" | "b" } | null;
  eraseMode: boolean;
}

interface ChessBoardProps {
  state: GameState;
  actions: GameActions;
  disabled?: boolean;
  editor?: EditorConfig;
}

function getPieceAtSquare(fenBoard: string, square: Square): string | null {
  const ranks = fenBoard.split("/");
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1]);
  if (rank < 0 || rank > 7 || file < 0 || file > 7) return null;
  const row = ranks[rank] ?? "";
  let col = 0;
  for (const ch of row) {
    if (ch >= "1" && ch <= "8") {
      col += parseInt(ch);
    } else {
      if (col === file) return ch;
      col++;
    }
  }
  return null;
}

function isPromotionMove(boardFen: string, from: Square, to: Square): boolean {
  const boardPart = boardFen.split(" ")[0];
  const piece = getPieceAtSquare(boardPart, from);
  if (!piece || piece.toLowerCase() !== "p") return false;
  return to[1] === "8" || to[1] === "1";
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

const PROMOTION_PIECES: Array<{ type: PieceSymbol; label: string }> = [
  { type: "q", label: "Queen" },
  { type: "r", label: "Rook" },
  { type: "b", label: "Bishop" },
  { type: "n", label: "Knight" },
];

// Highlight colors cycle on right-click: none → orange → blue → green → none
const HIGHLIGHT_COLORS = [
  "rgba(235, 97, 20, 0.55)",
  "rgba(50, 120, 220, 0.50)",
  "rgba(60, 180, 60, 0.50)",
];

export function ChessBoard({ state, actions, disabled, editor }: ChessBoardProps) {
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
  const { makeMove, selectSquare, putPiece } = actions;

  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Arrow and highlight state — purely visual, cleared when a move is made
  const [userArrows, setUserArrows] = useState<Arrow[]>([]);
  const [highlights, setHighlights] = useState<Record<string, number>>({});

  const isPlayMode = mode === "play";
  const isEditorMode = mode === "editor";
  const isInteractive = !disabled && !isReviewing && isPlayMode && !gameOver.over && !pendingPromotion;
  const isEditorInteractive = isEditorMode;

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Right-click highlights (drawn below everything else)
    for (const [sq, colorIdx] of Object.entries(highlights)) {
      const color = HIGHLIGHT_COLORS[colorIdx % HIGHLIGHT_COLORS.length];
      if (color) styles[sq] = { backgroundColor: color };
    }

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

    if (isCheck && !isReviewing && isPlayMode) {
      const kingSquare = findKingSquare(fen, turn);
      if (kingSquare) {
        styles[kingSquare] = { backgroundColor: "rgba(220, 50, 50, 0.55)" };
      }
    }

    return styles;
  }, [highlights, selectedSquare, legalMoves, boardLastMove, isCheck, fen, turn, isReviewing, isPlayMode]);

  // Right-click on a square: cycle highlight color
  const onSquareRightClick = useCallback(({ square }: SquareHandlerArgs) => {
    const sq = square as Square;
    setHighlights((prev) => {
      const current = prev[sq];
      if (current === undefined) {
        return { ...prev, [sq]: 0 };
      }
      const next = current + 1;
      if (next >= HIGHLIGHT_COLORS.length) {
        const { [sq]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [sq]: next };
    });
  }, []);

  // Clear highlights + arrows when a left-click move happens
  const clearAnnotations = useCallback(() => {
    setHighlights({});
    setUserArrows([]);
  }, []);

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!isInteractive || !targetSquare) return false;
      const from = sourceSquare as Square;
      const to = targetSquare as Square;
      if (isPromotionMove(boardFen, from, to)) {
        setPendingPromotion({ from, to });
        return false;
      }
      const ok = makeMove(from, to);
      if (ok) clearAnnotations();
      return ok;
    },
    [makeMove, isInteractive, boardFen, clearAnnotations]
  );

  const onEditorPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!isEditorInteractive || !targetSquare) return false;
      const boardPart = boardFen.split(" ")[0];
      const pieceChar = getPieceAtSquare(boardPart, sourceSquare as Square);
      if (!pieceChar) return false;
      const color: "w" | "b" = pieceChar === pieceChar.toUpperCase() ? "w" : "b";
      const type = pieceChar.toLowerCase() as PieceSymbol;
      putPiece(sourceSquare as Square, null);
      putPiece(targetSquare as Square, { type, color });
      return true;
    },
    [isEditorInteractive, boardFen, putPiece]
  );

  const onSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (isEditorInteractive) {
        if (editor?.eraseMode) {
          putPiece(square as Square, null);
        } else if (editor?.piece) {
          putPiece(square as Square, editor.piece);
        }
        return;
      }

      if (!isInteractive) return;
      const sq = square as Square;
      if (selectedSquare) {
        if (selectedSquare === sq) { selectSquare(null); return; }
        if (legalMoves.includes(sq)) {
          if (isPromotionMove(boardFen, selectedSquare, sq)) {
            setPendingPromotion({ from: selectedSquare, to: sq });
            return;
          }
          const ok = makeMove(selectedSquare, sq);
          if (ok) clearAnnotations();
          return;
        }
      }
      selectSquare(sq);
    },
    [selectedSquare, legalMoves, makeMove, selectSquare, isInteractive, isEditorInteractive,
     boardFen, editor, putPiece, clearAnnotations]
  );

  const onPieceDrag = useCallback(
    ({ square }: PieceHandlerArgs) => {
      if (isInteractive && square) selectSquare(square as Square);
    },
    [selectSquare, isInteractive]
  );

  const resolvePromotion = useCallback(
    (pieceType: PieceSymbol) => {
      if (!pendingPromotion) return;
      makeMove(pendingPromotion.from, pendingPromotion.to, pieceType);
      setPendingPromotion(null);
      selectSquare(null);
      clearAnnotations();
    },
    [pendingPromotion, makeMove, selectSquare, clearAnnotations]
  );

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    selectSquare(null);
  }, [selectSquare]);

  const effectiveDrop = isEditorInteractive ? onEditorPieceDrop : onPieceDrop;

  return (
    <div className="w-full max-w-[560px] aspect-square relative select-none">
      <Chessboard
        options={{
          position: boardFen,
          onPieceDrop: effectiveDrop,
          onSquareClick,
          onPieceDrag,
          onSquareRightClick,
          squareStyles: customSquareStyles,
          boardOrientation: boardFlipped ? "black" : "white",
          allowDragging: isInteractive || isEditorInteractive,
          // Built-in right-click drag arrow drawing
          allowDrawingArrows: !isEditorInteractive,
          arrows: userArrows,
          onArrowsChange: ({ arrows }) => setUserArrows(arrows),
          clearArrowsOnClick: false, // we manage clearing ourselves
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
      {isEditorMode && (
        <div className="absolute inset-0 rounded-[6px] pointer-events-none ring-2 ring-orange-400/40" />
      )}
      {pendingPromotion && (
        <>
          <div
            className="absolute inset-0 bg-black/60 rounded-[6px] z-40 cursor-pointer"
            onClick={cancelPromotion}
          />
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="pointer-events-auto bg-card border border-border rounded-xl shadow-2xl p-4 flex flex-col items-center gap-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Promote pawn
              </p>
              <div className="flex gap-2">
                {PROMOTION_PIECES.map(({ type, label }) => (
                  <button
                    key={type}
                    title={label}
                    onClick={() => resolvePromotion(type)}
                    className="w-14 h-14 rounded-lg border border-border hover:bg-accent/60 hover:border-primary/40 transition-colors flex items-center justify-center bg-muted/40"
                  >
                    <img
                      src={`https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${turn}${type}.png`}
                      alt={label}
                      className="w-11 h-11 object-contain"
                    />
                  </button>
                ))}
              </div>
              <button
                onClick={cancelPromotion}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Annotation hint */}
      {isPlayMode && !gameOver.over && !isReviewing && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-[9px] text-white/20 select-none">
            Right-click to annotate · Drag right-click for arrows
          </span>
        </div>
      )}
    </div>
  );
}
