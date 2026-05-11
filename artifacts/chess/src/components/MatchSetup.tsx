import { Bot, User } from "lucide-react";
import type { MatchConfig, PlayerType } from "@/lib/engine-types";

interface MatchSetupProps {
  config: MatchConfig;
  onChange: (config: MatchConfig) => void;
  isBotThinking: boolean;
  botError: string | null;
  onClearError: () => void;
}

export function MatchSetup({ config, onChange, isBotThinking, botError, onClearError }: MatchSetupProps) {
  function setPlayer(side: "white" | "black", type: PlayerType) {
    onChange({ ...config, [`${side}`]: type });
  }

  function setBotFile(side: "white" | "black", file: string) {
    onChange({ ...config, [`${side}BotFile`]: file });
  }

  return (
    <div className="rounded-lg bg-card border border-card-border p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Players</span>
        {isBotThinking && (
          <span className="flex items-center gap-1.5 text-xs text-primary">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Bot thinking…
          </span>
        )}
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

      {botError && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-1.5">
          <span className="flex-1 break-all">{botError}</span>
          <button onClick={onClearError} className="shrink-0 hover:opacity-70">✕</button>
        </div>
      )}
    </div>
  );
}

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
