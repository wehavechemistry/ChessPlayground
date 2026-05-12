export type PlayerType = "human" | "bot";

export interface MatchConfig {
  white: PlayerType;
  black: PlayerType;
  whiteBotFile: string;
  blackBotFile: string;
  /** thinking time in ms for white bot */
  timeMsWhite: number;
  /** thinking time in ms for black bot */
  timeMsBlack: number;
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  white: "human",
  black: "human",
  whiteBotFile: "random_bot",
  blackBotFile: "random_bot",
  timeMsWhite: 1000,
  timeMsBlack: 1000,
};

export type EngineLogType = "start" | "move" | "error";

export interface EngineLog {
  id: number;
  time: string;
  side: "w" | "b";
  type: EngineLogType;
  message: string;
}
