import { useState, useRef } from "react";
import {
  RotateCcw, FlipVertical2, Undo2, Copy, Upload, Download, Pencil, Play,
} from "lucide-react";
import type { GameState, GameActions, GameMode } from "@/hooks/useChessGame";

interface GameControlsProps {
  state: GameState;
  actions: GameActions;
}

export function GameControls({ state, actions }: GameControlsProps) {
  const { turn, gameOver, isCheck, mode, moveHistory } = state;
  const { resetGame, undoMove, flipBoard, loadFen, loadPgn, getCurrentFen, getPgn, setMode } = actions;

  const [fenInput, setFenInput] = useState("");
  const [pgnInput, setPgnInput] = useState("");
  const [fenError, setFenError] = useState("");
  const [pgnError, setPgnError] = useState("");
  const [activePanel, setActivePanel] = useState<"fen" | "pgn" | null>(null);
  const [copied, setCopied] = useState<"fen" | "pgn" | null>(null);

  const fenRef = useRef<HTMLTextAreaElement>(null);

  function handleLoadFen() {
    const ok = loadFen(fenInput.trim());
    if (ok) {
      setFenError("");
      setFenInput("");
      setActivePanel(null);
    } else {
      setFenError("Invalid FEN string");
    }
  }

  function handleLoadPgn() {
    const ok = loadPgn(pgnInput.trim());
    if (ok) {
      setPgnError("");
      setPgnInput("");
      setActivePanel(null);
    } else {
      setPgnError("Invalid PGN");
    }
  }

  function handleCopyFen() {
    navigator.clipboard.writeText(getCurrentFen());
    setCopied("fen");
    setTimeout(() => setCopied(null), 1500);
  }

  function handleCopyPgn() {
    const pgn = getPgn();
    if (!pgn) return;
    navigator.clipboard.writeText(pgn);
    setCopied("pgn");
    setTimeout(() => setCopied(null), 1500);
  }

  function toggleMode(m: GameMode) {
    setMode(mode === m ? "play" : m);
  }

  const turnLabel = turn === "w" ? "White to move" : "Black to move";
  const statusText = gameOver.over
    ? gameOver.reason
    : isCheck
    ? (turn === "w" ? "White" : "Black") + " is in check"
    : turnLabel;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-card border border-card-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full border border-border ${gameOver.over ? "bg-destructive" : isCheck ? "bg-orange-400" : turn === "w" ? "bg-white" : "bg-zinc-800"}`}
          />
          <span className={`text-sm font-medium ${gameOver.over ? "text-destructive" : isCheck ? "text-orange-400" : "text-foreground"}`}>
            {statusText}
          </span>
          {moveHistory.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {Math.ceil(moveHistory.length / 2)} move{moveHistory.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <IconButton icon={<RotateCcw size={14} />} label="New Game" onClick={resetGame} />
        <IconButton icon={<Undo2 size={14} />} label="Undo" onClick={undoMove} disabled={moveHistory.length === 0} />
        <IconButton icon={<FlipVertical2 size={14} />} label="Flip Board" onClick={flipBoard} />
        <IconButton
          icon={mode === "editor" ? <Play size={14} /> : <Pencil size={14} />}
          label={mode === "editor" ? "Play Mode" : "Board Editor"}
          onClick={() => toggleMode("editor")}
          active={mode === "editor"}
        />
      </div>

      <div className="flex gap-2">
        <PanelToggle
          icon={<Upload size={13} />}
          label="Import FEN"
          active={activePanel === "fen"}
          onClick={() => setActivePanel(activePanel === "fen" ? null : "fen")}
        />
        <PanelToggle
          icon={<Upload size={13} />}
          label="Import PGN"
          active={activePanel === "pgn"}
          onClick={() => setActivePanel(activePanel === "pgn" ? null : "pgn")}
        />
        <button
          onClick={handleCopyFen}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded-md bg-muted hover:bg-accent/60 transition-colors text-muted-foreground"
        >
          <Copy size={12} />
          {copied === "fen" ? "Copied!" : "Copy FEN"}
        </button>
        <button
          onClick={handleCopyPgn}
          disabled={moveHistory.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded-md bg-muted hover:bg-accent/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-muted-foreground"
        >
          <Download size={12} />
          {copied === "pgn" ? "Copied!" : "Copy PGN"}
        </button>
      </div>

      {activePanel === "fen" && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 border border-border">
          <label className="text-xs font-medium text-muted-foreground">Paste FEN string</label>
          <textarea
            ref={fenRef}
            value={fenInput}
            onChange={(e) => { setFenInput(e.target.value); setFenError(""); }}
            placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            rows={2}
            className="w-full text-xs font-mono bg-card border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
          />
          {fenError && <p className="text-xs text-destructive">{fenError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleLoadFen}
              disabled={!fenInput.trim()}
              className="flex-1 text-xs py-1.5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Load Position
            </button>
            <button
              onClick={() => setActivePanel(null)}
              className="text-xs py-1.5 px-3 rounded-md bg-muted hover:bg-accent/60 transition-colors text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {activePanel === "pgn" && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 border border-border">
          <label className="text-xs font-medium text-muted-foreground">Paste PGN</label>
          <textarea
            value={pgnInput}
            onChange={(e) => { setPgnInput(e.target.value); setPgnError(""); }}
            placeholder="1. e4 e5 2. Nf3 ..."
            rows={4}
            className="w-full text-xs font-mono bg-card border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
          />
          {pgnError && <p className="text-xs text-destructive">{pgnError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleLoadPgn}
              disabled={!pgnInput.trim()}
              className="flex-1 text-xs py-1.5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Load PGN
            </button>
            <button
              onClick={() => setActivePanel(null)}
              className="text-xs py-1.5 px-3 rounded-md bg-muted hover:bg-accent/60 transition-colors text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

function IconButton({ icon, label, onClick, disabled, active }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 text-xs py-2 px-3 rounded-md border transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-primary/20 border-primary/40 text-primary"
          : "bg-muted/50 border-border hover:bg-accent/60 text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface PanelToggleProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function PanelToggle({ icon, label, active, onClick }: PanelToggleProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded-md border transition-colors ${
        active
          ? "bg-primary/20 border-primary/40 text-primary"
          : "bg-muted/50 border-border hover:bg-accent/60 text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
