import { ChessBoard } from "@/components/ChessBoard";
import { GameControls } from "@/components/GameControls";
import { MoveHistory } from "@/components/MoveHistory";
import { BoardEditor } from "@/components/BoardEditor";
import { MatchSetup } from "@/components/MatchSetup";
import { useMatchController } from "@/hooks/useMatchController";

export default function Home() {
  const { game, config, setConfig, isBotThinking, botError, clearBotError } = useMatchController();

  const state = {
    fen: game.fen,
    boardFen: game.boardFen,
    boardLastMove: game.boardLastMove,
    moveHistory: game.moveHistory,
    selectedSquare: game.selectedSquare,
    legalMoves: game.legalMoves,
    lastMove: game.lastMove,
    isCheck: game.isCheck,
    gameOver: game.gameOver,
    turn: game.turn,
    mode: game.mode,
    boardFlipped: game.boardFlipped,
    isReviewing: game.isReviewing,
    reviewIndex: game.reviewIndex,
  };

  const actions = {
    makeMove: game.makeMove,
    selectSquare: game.selectSquare,
    resetGame: game.resetGame,
    loadFen: game.loadFen,
    loadPgn: game.loadPgn,
    getCurrentFen: game.getCurrentFen,
    getPgn: game.getPgn,
    flipBoard: game.flipBoard,
    setMode: game.setMode,
    putPiece: game.putPiece,
    goToMove: game.goToMove,
    goToFirst: game.goToFirst,
    goPrev: game.goPrev,
    goNext: game.goNext,
    goToLive: game.goToLive,
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
          {game.isReviewing ? "Review mode — click moves or use nav buttons" : "Drag & drop to move · Click to select"}
        </span>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-6 p-6">
        <div className="w-full lg:w-auto flex justify-center">
          <ChessBoard state={state} actions={actions} disabled={isBotThinking} />
        </div>

        <div className="w-full lg:w-72 flex flex-col gap-3">
          <MatchSetup
            config={config}
            onChange={setConfig}
            isBotThinking={isBotThinking}
            botError={botError}
            onClearError={clearBotError}
          />

          <GameControls state={state} actions={actions} isBotThinking={isBotThinking} />

          {game.mode === "editor" ? (
            <div className="rounded-lg bg-card border border-card-border p-3">
              <BoardEditor actions={actions} />
            </div>
          ) : (
            <div className="rounded-lg bg-card border border-card-border p-3 flex flex-col">
              <MoveHistory
                moves={game.moveHistory}
                reviewIndex={game.reviewIndex}
                isReviewing={game.isReviewing}
                onGoToMove={game.goToMove}
                onGoToFirst={game.goToFirst}
                onGoPrev={game.goPrev}
                onGoNext={game.goNext}
                onGoToLive={game.goToLive}
              />
            </div>
          )}

          <div className="px-1">
            <p className="text-xs font-mono text-foreground/40 truncate">{game.fen.split(" ").slice(0, 2).join(" ")}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
