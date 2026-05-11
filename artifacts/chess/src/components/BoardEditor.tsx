import { useState } from "react";
import type { Square, PieceSymbol } from "@/lib/chess-engine";
import type { GameActions } from "@/hooks/useChessGame";

const PIECES: Array<{ symbol: string; type: PieceSymbol; color: "w" | "b"; label: string }> = [
  { symbol: "wK", type: "k", color: "w", label: "White King" },
  { symbol: "wQ", type: "q", color: "w", label: "White Queen" },
  { symbol: "wR", type: "r", color: "w", label: "White Rook" },
  { symbol: "wB", type: "b", color: "w", label: "White Bishop" },
  { symbol: "wN", type: "n", color: "w", label: "White Knight" },
  { symbol: "wP", type: "p", color: "w", label: "White Pawn" },
  { symbol: "bK", type: "k", color: "b", label: "Black King" },
  { symbol: "bQ", type: "q", color: "b", label: "Black Queen" },
  { symbol: "bR", type: "r", color: "b", label: "Black Rook" },
  { symbol: "bB", type: "b", color: "b", label: "Black Bishop" },
  { symbol: "bN", type: "n", color: "b", label: "Black Knight" },
  { symbol: "bP", type: "p", color: "b", label: "Black Pawn" },
];

interface BoardEditorProps {
  actions: Pick<GameActions, "putPiece">;
}

export function BoardEditor({ actions }: BoardEditorProps) {
  const [selected, setSelected] = useState<typeof PIECES[0] | null>(null);
  const [eraseMode, setEraseMode] = useState(false);
  const { putPiece } = actions;

  function handleSquareClick(square: Square) {
    if (eraseMode) {
      putPiece(square, null);
      return;
    }
    if (!selected) return;
    putPiece(square, { type: selected.type, color: selected.color });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
        <p className="text-xs text-primary font-medium">Board Editor Mode</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {eraseMode
            ? "Click squares to remove pieces"
            : selected
            ? `Placing: ${selected.label}`
            : "Select a piece below, then click a square"}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">White Pieces</p>
        <div className="grid grid-cols-6 gap-1">
          {PIECES.filter((p) => p.color === "w").map((piece) => (
            <PieceTile
              key={piece.symbol}
              piece={piece}
              selected={!eraseMode && selected?.symbol === piece.symbol}
              onClick={() => { setEraseMode(false); setSelected(piece); }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Black Pieces</p>
        <div className="grid grid-cols-6 gap-1">
          {PIECES.filter((p) => p.color === "b").map((piece) => (
            <PieceTile
              key={piece.symbol}
              piece={piece}
              selected={!eraseMode && selected?.symbol === piece.symbol}
              onClick={() => { setEraseMode(false); setSelected(piece); }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={() => { setEraseMode((e) => !e); setSelected(null); }}
        className={`text-xs py-2 rounded-md border transition-colors font-medium ${
          eraseMode
            ? "bg-destructive/20 border-destructive/40 text-destructive"
            : "bg-muted/50 border-border hover:bg-accent/60 text-muted-foreground"
        }`}
      >
        {eraseMode ? "Erasing (click to stop)" : "Erase Piece"}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        Tip: Click a square to place the selected piece
      </p>
    </div>
  );
}

interface PieceTileProps {
  piece: typeof PIECES[0];
  selected: boolean;
  onClick: () => void;
}

function PieceTile({ piece, selected, onClick }: PieceTileProps) {
  return (
    <button
      onClick={onClick}
      title={piece.label}
      className={`aspect-square rounded border transition-colors flex items-center justify-center overflow-hidden ${
        selected
          ? "border-primary bg-primary/20"
          : "border-border bg-muted/40 hover:bg-accent/40"
      }`}
    >
      <div className="w-7 h-7 pointer-events-none">
        <img
          src={`https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${piece.symbol.toLowerCase()}.png`}
          alt={piece.label}
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    </button>
  );
}
