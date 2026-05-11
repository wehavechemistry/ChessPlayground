export type PlayerType = "human" | "bot";

export interface MatchConfig {
  white: PlayerType;
  black: PlayerType;
  whiteBotFile: string;
  blackBotFile: string;
}

export type EngineLogType = "start" | "move" | "error";

export interface EngineLog {
  id: number;
  time: string;
  side: "w" | "b";
  type: EngineLogType;
  message: string;
}
