import { useEffect, useRef } from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import type { Move } from "@/lib/chess-engine";

interface MoveHistoryProps {
  moves: Move[];
  reviewIndex: number | null;
  isReviewing: boolean;
  onGoToMove: (index: number) => void;
  onGoToFirst: () => void;
  onGoPrev: () => void;
  onGoNext: () => void;
  onGoToLive: () => void;
}

export function MoveHistory({
  moves,
  reviewIndex,
  isReviewing,
  onGoToMove,
  onGoToFirst,
  onGoPrev,
  onGoNext,
  onGoToLive,
}: MoveHistoryProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activePlyIndex = reviewIndex === null ? moves.length - 1 : reviewIndex;

  useEffect(() => {
    if (!isReviewing && moves.length > 0) {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    } else if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activePlyIndex, isReviewing, moves.length]);

  // Keyboard navigation: ← → Home End
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't steal keys when user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onGoPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onGoNext();
      } else if (e.key === "Home") {
        e.preventDefault();
        if (moves.length > 0) onGoToFirst();
      } else if (e.key === "End") {
        e.preventDefault();
        if (moves.length > 0) onGoToLive();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onGoPrev, onGoNext, onGoToFirst, onGoToLive, moves.length]);

  const pairs: Array<{ white: Move; whiteIdx: number; black?: Move; blackIdx?: number; num: number }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ white: moves[i], whiteIdx: i, black: moves[i + 1], blackIdx: i + 1, num: i / 2 + 1 });
  }

  const atStart = isReviewing && reviewIndex === -1;
  const atLive = !isReviewing;
  const canPrev = moves.length > 0 && !atStart;
  const canNext = moves.length > 0 && !atLive;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Move History
        </h3>
        <div className="flex items-center gap-1.5">
          {moves.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.ceil(moves.length / 2)} move{moves.length !== 2 ? "s" : ""}
            </span>
          )}
          {isReviewing && (
            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">
              Review
            </span>
          )}
        </div>
      </div>

      {/* Scrollable move list */}
      <div
        ref={containerRef}
        className="overflow-y-auto rounded-md bg-muted/30 h-[200px]"
        style={{ scrollbarWidth: "thin" }}
      >
        {pairs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No moves yet</p>
        ) : (
          <div className="p-1">
            {pairs.map((pair) => (
              <div
                key={pair.num}
                className="grid grid-cols-[2rem_1fr_1fr] gap-x-1 items-center text-sm rounded px-1"
              >
                <span className="text-muted-foreground text-xs tabular-nums">{pair.num}.</span>

                <MoveCell
                  san={pair.white.san}
                  index={pair.whiteIdx}
                  isActive={pair.whiteIdx === activePlyIndex}
                  ref={pair.whiteIdx === activePlyIndex ? activeRef : undefined}
                  onClick={() => onGoToMove(pair.whiteIdx)}
                />

                {pair.black ? (
                  <MoveCell
                    san={pair.black.san}
                    index={pair.blackIdx!}
                    isActive={pair.blackIdx === activePlyIndex}
                    ref={pair.blackIdx === activePlyIndex ? activeRef : undefined}
                    onClick={() => onGoToMove(pair.blackIdx!)}
                  />
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <NavBtn icon={<ChevronsLeft size={13} />} title="Start (Home)" onClick={onGoToFirst} disabled={!canPrev} />
        <NavBtn icon={<ChevronLeft size={13} />} title="Previous (←)" onClick={onGoPrev} disabled={!canPrev} />
        <NavBtn icon={<ChevronRight size={13} />} title="Next (→)" onClick={onGoNext} disabled={!canNext} />
        <NavBtn icon={<ChevronsRight size={13} />} title="Live (End)" onClick={onGoToLive} disabled={!canNext} />
        {isReviewing && (
          <button
            onClick={onGoToLive}
            className="ml-2 text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium"
          >
            Back to live
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      {moves.length > 0 && (
        <p className="text-center text-[10px] text-muted-foreground/40 mt-1 select-none">
          ← → to step · Home / End to jump
        </p>
      )}
    </div>
  );
}

interface MoveCellProps {
  san: string;
  index: number;
  isActive: boolean;
  onClick: () => void;
  ref?: React.Ref<HTMLButtonElement>;
}

function MoveCell({ san, isActive, onClick, ref }: MoveCellProps) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`py-0.5 px-1 text-left font-mono rounded transition-colors w-full text-sm ${
        isActive
          ? "bg-primary/30 text-primary font-semibold"
          : "hover:bg-accent/40 text-foreground"
      }`}
    >
      {san}
    </button>
  );
}

interface NavBtnProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}

function NavBtn({ icon, title, onClick, disabled }: NavBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded border border-border bg-muted/50 hover:bg-accent/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-foreground"
    >
      {icon}
    </button>
  );
}
