import { useEffect, useRef } from "react";
import { Terminal, Trash2 } from "lucide-react";
import type { EngineLog } from "@/lib/engine-types";

interface EngineConsoleProps {
  logs: EngineLog[];
  onClear: () => void;
}

export function EngineConsole({ logs, onClear }: EngineConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  // Scroll the inner container — never the page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Only auto-scroll if user was already at (or near) the bottom
    const threshold = 40;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (atBottom || wasAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs.length]);

  // Track whether user is at bottom manually
  function onScroll() {
    const el = containerRef.current;
    if (!el) return;
    wasAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  return (
    <div className="rounded-lg bg-card border border-card-border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Terminal size={12} className="text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Engine Console
          </h3>
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            title="Clear logs"
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="h-28 overflow-y-auto font-mono text-[11px] space-y-0.5 bg-muted/30 rounded-md p-2"
        style={{ scrollbarWidth: "thin" }}
      >
        {logs.length === 0 ? (
          <p className="text-muted-foreground italic">No engine activity yet</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-1.5 leading-relaxed">
              <span className="text-muted-foreground shrink-0 select-none">{log.time}</span>
              <span
                className={
                  log.type === "error"
                    ? "text-destructive"
                    : log.type === "move"
                    ? "text-green-400"
                    : "text-foreground/70"
                }
              >
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
