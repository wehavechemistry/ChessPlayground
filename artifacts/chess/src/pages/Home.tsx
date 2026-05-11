import { ChessBoard } from "@/components/ChessBoard";
import { GameControls } from "@/components/GameControls";
import { MoveHistory } from "@/components/MoveHistory";
import { BoardEditor } from "@/components/BoardEditor";
import { useChessGame } from "@/hooks/useChessGame";

export default function Home() {
  const game = useChessGame();

  const state = {
    fen: game.fen,
    moveHistory: game.moveHistory,
    selectedSquare: game.selectedSquare,
    legalMoves: game.legalMoves,
    lastMove: game.lastMove,
    isCheck: game.isCheck,
    gameOver: game.gameOver,
    turn: game.turn,
    mode: game.mode,
    boardFlipped: game.boardFlipped,
  };

  const actions = {
    makeMove: game.makeMove,
    selectSquare: game.selectSquare,
    resetGame: game.resetGame,
    loadFen: game.loadFen,
    loadPgn: game.loadPgn,
    getCurrentFen: game.getCurrentFen,
    getPgn: game.getPgn,
    undoMove: game.undoMove,
    flipBoard: game.flipBoard,
    setMode: game.setMode,
    putPiece: game.putPiece,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 grid grid-cols-2 grid-rows-2 rounded overflow-hidden">
            <div className="bg-[#f0d9b5]" />
            <div className="bg-[#5d8a6e]" />
            <div className="bg-[#5d8a6e]" />
            <div className="bg-[#f0d9b5]" />
          </div>
          <span className="font-semibold text-base tracking-tight">Chess Playground</span>
        </div>
        <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
          Drag & drop to move · Click to select
        </span>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-6 p-6">
        <div className="w-full lg:w-auto flex justify-center">
          <ChessBoard state={state} actions={actions} />
        </div>

        <div className="w-full lg:w-72 flex flex-col gap-4">
          <GameControls state={state} actions={actions} />

          {game.mode === "editor" ? (
            <div className="rounded-lg bg-card border border-card-border p-3">
              <BoardEditor actions={actions} />
            </div>
          ) : (
            <div className="rounded-lg bg-card border border-card-border p-3 flex-1 min-h-[200px] flex flex-col">
              <MoveHistory moves={game.moveHistory} />
            </div>
          )}

          <div className="text-xs text-muted-foreground px-1 space-y-1">
            <p>
              <span className="font-mono text-foreground/60">{game.fen.split(" ").slice(0, 2).join(" ")}</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
