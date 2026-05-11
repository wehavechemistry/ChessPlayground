import { Chess } from "chess.js";

export type { Chess };
export type Square = import("chess.js").Square;
export type Move = import("chess.js").Move;
export type PieceSymbol = import("chess.js").PieceSymbol;
export type Color = import("chess.js").Color;
export type Piece = import("chess.js").Piece;

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const PIECE_LABELS: Record<string, string> = {
  wp: "White Pawn",   wn: "White Knight", wb: "White Bishop",
  wr: "White Rook",   wq: "White Queen",  wk: "White King",
  bp: "Black Pawn",   bn: "Black Knight", bb: "Black Bishop",
  br: "Black Rook",   bq: "Black Queen",  bk: "Black King",
};

export function getLegalMoves(chess: Chess, square: Square): Square[] {
  return chess.moves({ square, verbose: true }).map((m) => m.to as Square);
}

export function isGameOver(chess: Chess): { over: boolean; reason: string } {
  if (chess.isCheckmate()) return { over: true, reason: "Checkmate" };
  if (chess.isStalemate()) return { over: true, reason: "Stalemate" };
  if (chess.isThreefoldRepetition()) return { over: true, reason: "Threefold repetition" };
  if (chess.isInsufficientMaterial()) return { over: true, reason: "Insufficient material" };
  if (chess.isDraw()) return { over: true, reason: "Draw" };
  return { over: false, reason: "" };
}

export function parsePgn(chess: Chess, pgn: string): boolean {
  try {
    chess.loadPgn(pgn);
    return true;
  } catch {
    return false;
  }
}

export function validateEditorPosition(fen: string): string[] {
  const errors: string[] = [];
  const boardPart = fen.split(" ")[0];

  const wKings = (boardPart.match(/K/g) ?? []).length;
  const bKings = (boardPart.match(/k/g) ?? []).length;

  if (wKings === 0) errors.push("White king is missing");
  if (wKings > 1) errors.push("Multiple white kings");
  if (bKings === 0) errors.push("Black king is missing");
  if (bKings > 1) errors.push("Multiple black kings");

  if (errors.length > 0) return errors;

  try {
    const chess = new Chess(fen);
    const turn = chess.turn();
    const fenParts = fen.split(" ");
    fenParts[1] = turn === "w" ? "b" : "w";
    fenParts[3] = "-";
    try {
      const flipped = new Chess(fenParts.join(" "));
      if (flipped.inCheck()) {
        const inCheckColor = turn === "w" ? "Black" : "White";
        errors.push(`${inCheckColor} king is in check but it is not their turn`);
      }
    } catch { /* ignore */ }
  } catch {
    errors.push("Position is not valid");
  }

  return errors;
}
