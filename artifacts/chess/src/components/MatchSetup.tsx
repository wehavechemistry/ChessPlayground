import { useState } from "react";
import { Bot, User, Settings, ChevronDown, ChevronUp } from "lucide-react";
import type { MatchConfig, PlayerType } from "@/lib/engine-types";

interface MatchSetupProps {
  config: MatchConfig;
  onChange: (config: MatchConfig) => void;
  isBotThinking: boolean;
  botError: string | null;
  onClearError: () => void;
}

export function MatchSetup({ config, onChange, isBotThinking, botError, onClearError }: MatchSetupProps) {
  const [showSettings, setShowSettings] = useState(false);

  function setPlayer(side: "white" | "black", type: PlayerType) {
    onChange({ ...config, [`${side}`]: type });
  }

  function setBotFile(side: "white" | "black", file: string) {
    onChange({ ...config, [`${side}BotFile`]: file });
  }

  function setTimeMs(side: "white" | "black", ms: number) {
    const key = side === "white" ? "timeMsWhite" : "timeMsBlack";
    onChange({ ...config, [key]: ms });
  }

  const hasBotPlayer = config.white === "bot" || config.black === "bot";

  return (
    <div className="rounded-lg bg-card border border-card-border p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Players</span>
        <div className="flex items-center gap-2">
          {isBotThinking && (
            <span className="flex items-center gap-1.5 text-xs text-primary">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Thinking…
            </span>
          )}
          {hasBotPlayer && (
            <button
              onClick={() => setShowSettings((s) => !s)}
              title="Engine settings"
              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border transition-colors ${
                showSettings
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-muted/40 border-border text-muted-foreground hover:bg-accent/40"
              }`}
            >
              <Settings size={11} />
              {showSettings ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PlayerSelector
          label="White"
          value={config.white}
          botFile={config.whiteBotFile}
          onChange={(t) => setPlayer("white", t)}
          onBotFileChange={(f) => setBotFile("white", f)}
        />
        <PlayerSelector
          label="Black"
          value={config.black}
          botFile={config.blackBotFile}
          onChange={(t) => setPlayer("black", t)}
          onBotFileChange={(f) => setBotFile("black", f)}
        />
      </div>

      {hasBotPlayer && showSettings && (
        <EngineSettings config={config} onSetTimeMs={setTimeMs} />
      )}

      {botError && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-1.5">
          <span className="flex-1 break-all">{botError}</span>
          <button onClick={onClearError} className="shrink-0 hover:opacity-70">✕</button>
        </div>
      )}
    </div>
  );
}

// ─── Engine Settings panel ───────────────────────────────────────────────────

const TIME_PRESETS = [250, 500, 1000, 2000, 5000];

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
}

interface EngineSettingsProps {
  config: MatchConfig;
  onSetTimeMs: (side: "white" | "black", ms: number) => void;
}

function EngineSettings({ config, onSetTimeMs }: EngineSettingsProps) {
  // Sync both at once
  function setBoth(ms: number) {
    onSetTimeMs("white", ms);
    onSetTimeMs("black", ms);
  }

  const bothSame = config.timeMsWhite === config.timeMsBlack;

  return (
    <div className="flex flex-col gap-3 pt-1 border-t border-border/60">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Engine Settings
      </p>

      {/* Quick presets (applies to both) */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Think time (both)</p>
        <div className="flex gap-1 flex-wrap">
          {TIME_PRESETS.map((ms) => (
            <button
              key={ms}
              onClick={() => setBoth(ms)}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                bothSame && config.timeMsWhite === ms
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-muted/40 border-border text-muted-foreground hover:bg-accent/40"
              }`}
            >
              {formatMs(ms)}
            </button>
          ))}
        </div>
      </div>

      {/* Per-side sliders */}
      <div className="flex flex-col gap-2.5">
        {config.white === "bot" && (
          <TimeSetting
            label="White think time"
            value={config.timeMsWhite}
            onChange={(ms) => onSetTimeMs("white", ms)}
          />
        )}
        {config.black === "bot" && (
          <TimeSetting
            label="Black think time"
            value={config.timeMsBlack}
            onChange={(ms) => onSetTimeMs("black", ms)}
          />
        )}
      </div>

      {/* Protocol info */}
      <div className="rounded-md bg-muted/40 border border-border/50 px-2.5 py-2 flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">Protocol fields sent to bot</p>
        <div className="font-mono text-[10px] text-muted-foreground/70 space-y-0.5">
          <p><span className="text-foreground/60">fen</span> — current position</p>
          <p><span className="text-foreground/60">legal_moves</span> — all legal moves (UCI)</p>
          <p><span className="text-foreground/60">turn</span> — <span className="text-green-400">"w"</span> or <span className="text-green-400">"b"</span></p>
          <p><span className="text-foreground/60">color</span> — <span className="text-green-400">"white"</span> or <span className="text-green-400">"black"</span></p>
          <p><span className="text-foreground/60">time_ms</span> — think budget in ms</p>
          <p><span className="text-foreground/60">moves</span> — full game history (UCI)</p>
        </div>
      </div>
    </div>
  );
}

interface TimeSettingProps {
  label: string;
  value: number;
  onChange: (ms: number) => void;
}

function TimeSetting({ label, value, onChange }: TimeSettingProps) {
  // Slider range: 100ms – 10000ms in log-ish steps
  const MIN = 100;
  const MAX = 10000;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-mono text-foreground/80 tabular-nums w-12 text-right">
          {formatMs(value)}
        </span>
      </div>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-primary cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/50">
        <span>{formatMs(MIN)}</span>
        <span>{formatMs(MAX)}</span>
      </div>
    </div>
  );
}

// ─── Player selector ─────────────────────────────────────────────────────────

interface PlayerSelectorProps {
  label: string;
  value: PlayerType;
  botFile: string;
  onChange: (type: PlayerType) => void;
  onBotFileChange: (file: string) => void;
}

function PlayerSelector({ label, value, botFile, onChange, onBotFileChange }: PlayerSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        <TypeBtn active={value === "human"} onClick={() => onChange("human")} title="Human">
          <User size={12} />
        </TypeBtn>
        <TypeBtn active={value === "bot"} onClick={() => onChange("bot")} title="Bot">
          <Bot size={12} />
        </TypeBtn>
      </div>
      {value === "bot" && (
        <input
          type="text"
          value={botFile}
          onChange={(e) => onBotFileChange(e.target.value)}
          placeholder="bot filename"
          spellCheck={false}
          className="text-xs font-mono bg-muted border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
        />
      )}
    </div>
  );
}

interface TypeBtnProps {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function TypeBtn({ active, onClick, title, children }: TypeBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded border transition-colors ${
        active
          ? "bg-primary/20 border-primary/40 text-primary"
          : "bg-muted/40 border-border text-muted-foreground hover:bg-accent/40"
      }`}
    >
      {children}
      <span>{title}</span>
    </button>
  );
}
