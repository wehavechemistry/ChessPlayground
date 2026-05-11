import { AlertCircle, Trash2, RotateCcw } from "lucide-react";
import type { PieceSymbol } from "@/lib/chess-engine";
import type { GameActions } from "@/hooks/useChessGame";

export interface EditorPiece {
  symbol: string;
  type: PieceSymbol;
  color: "w" | "b";
  label: string;
}

const PIECES: EditorPiece[] = [
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

export { PIECES };

interface BoardEditorProps {
  selectedPiece: EditorPiece | null;
  eraseMode: boolean;
  onSelectPiece: (piece: EditorPiece | null) => void;
  onSetEraseMode: (erase: boolean) => void;
  validationErrors: string[];
  turn: "w" | "b";
  actions: Pick<GameActions, "clearBoard" | "resetGame" | "setTurnToMove">;
}

export function BoardEditor({
  selectedPiece,
  eraseMode,
  onSelectPiece,
  onSetEraseMode,
  validationErrors,
  turn,
  actions,
}: BoardEditorProps) {
  const { clearBoard, resetGame, setTurnToMove } = actions;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-orange-400/30 bg-orange-400/10 px-3 py-2">
        <p className="text-xs text-orange-400 font-medium">Board Editor Mode</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {eraseMode
            ? "Click squares to remove pieces · Drag to rearrange"
            : selectedPiece
            ? `Placing: ${selectedPiece.label} · Drag to rearrange`
            : "Select a piece below, then click a square · Drag to rearrange"}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">White Pieces</p>
        <div className="grid grid-cols-6 gap-1">
          {PIECES.filter((p) => p.color === "w").map((piece) => (
            <PieceTile
              key={piece.symbol}
              piece={piece}
              selected={!eraseMode && selectedPiece?.symbol === piece.symbol}
              onClick={() => { onSetEraseMode(false); onSelectPiece(piece); }}
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
              selected={!eraseMode && selectedPiece?.symbol === piece.symbol}
              onClick={() => { onSetEraseMode(false); onSelectPiece(piece); }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => { onSetEraseMode(!eraseMode); onSelectPiece(null); }}
          className={`flex-1 text-xs py-2 rounded-md border transition-colors font-medium ${
            eraseMode
              ? "bg-destructive/20 border-destructive/40 text-destructive"
              : "bg-muted/50 border-border hover:bg-accent/60 text-muted-foreground"
          }`}
        >
          {eraseMode ? "Erasing — stop" : "Erase Piece"}
        </button>
        <button
          onClick={() => { onSelectPiece(null); onSetEraseMode(false); clearBoard(); }}
          title="Clear all pieces"
          className="text-xs py-2 px-3 rounded-md border border-border bg-muted/50 hover:bg-accent/60 transition-colors text-muted-foreground flex items-center gap-1"
        >
          <Trash2 size={12} />
        </button>
        <button
          onClick={() => { onSelectPiece(null); onSetEraseMode(false); resetGame(); }}
          title="Reset to starting position"
          className="text-xs py-2 px-3 rounded-md border border-border bg-muted/50 hover:bg-accent/60 transition-colors text-muted-foreground flex items-center gap-1"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">Side to move:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setTurnToMove("w")}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              turn === "w"
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-muted/40 border-border text-muted-foreground hover:bg-accent/40"
            }`}
          >
            White
          </button>
          <button
            onClick={() => setTurnToMove("b")}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              turn === "b"
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-muted/40 border-border text-muted-foreground hover:bg-accent/40"
            }`}
          >
            Black
          </button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="flex flex-col gap-1 p-2 rounded-md bg-destructive/10 border border-destructive/20">
          <p className="text-xs font-semibold text-destructive mb-0.5">Invalid position</p>
          {validationErrors.map((err, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle size={11} className="shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PieceTileProps {
  piece: EditorPiece;
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
