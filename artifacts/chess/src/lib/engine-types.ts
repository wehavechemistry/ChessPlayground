export type PlayerType = "human" | "bot";

export interface MatchConfig {
  white: PlayerType;
  black: PlayerType;
  whiteBotFile: string;
  blackBotFile: string;
}
