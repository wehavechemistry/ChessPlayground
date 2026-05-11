import { useEffect, useRef } from "react";
import type { Move } from "@/lib/chess-engine";

interface MoveHistoryProps {
  moves: Move[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moves.length]);

  const pairs: Array<{ white: Move; black?: Move; num: number }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ white: moves[i], black: moves[i + 1], num: i / 2 + 1 });
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        Move History
      </h3>
      <div className="flex-1 overflow-y-auto min-h-0 rounded-md bg-muted/30">
        {pairs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No moves yet</p>
        ) : (
          <div className="p-1">
            {pairs.map((pair) => (
              <div
                key={pair.num}
                className="grid grid-cols-[2rem_1fr_1fr] gap-x-1 items-center text-sm rounded hover:bg-accent/40 px-1"
              >
                <span className="text-muted-foreground text-xs tabular-nums">{pair.num}.</span>
                <span className="py-0.5 font-mono">{pair.white.san}</span>
                {pair.black && (
                  <span className="py-0.5 font-mono">{pair.black.san}</span>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
