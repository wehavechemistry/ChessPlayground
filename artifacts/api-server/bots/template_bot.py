"""
template_bot.py — Official Chess Playground Bot Template

Protocol (JSON over stdin/stdout):
  stdin:  {"fen": "...", "legal_moves": [...], "turn": "w"|"b",
           "color": "white"|"black", "time_ms": 1000}
  stdout: {"bestmove": "e2e4"}

Key protocol fields
-------------------
  fen         — The ONLY source of truth for board state. Encodes position,
                side to move, castling rights, and en passant square.
                Use chess.Board(fen) to reconstruct the exact position.

  legal_moves — All legal UCI moves for the side to move, pre-computed from
                the FEN by the server. Pick from here to avoid illegal moves.
                Format: "e2e4", promotion: "e7e8q".

  turn        — "w" or "b"  (same as python-chess board.turn)
  color       — "white" or "black"  — unambiguous human-readable alias.
  time_ms     — Think budget in ms. Return before this expires.

IMPORTANT NOTES
---------------
* Do NOT use the `moves` field (it was removed — FEN is the single source of truth).
* Always verify your move is in legal_moves, or let the server validate it.
* Use board.turn after chess.Board(fen) — it will match data["turn"].
* Debug output goes to stderr only. Any stdout that isn't valid JSON will break things.

Requirements:
  pip install chess

Usage:
  Copy this file, rename it (e.g. my_engine.py), implement search() below.
  In the playground, enter "my_engine" as the bot filename.
"""

import sys
import json
import time
import random
import math

try:
    import chess
    HAS_CHESS = True
except ImportError:
    HAS_CHESS = False


def main() -> None:
    raw = sys.stdin.readline()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        _fatal(f"Failed to parse input JSON: {exc}")

    fen: str = data["fen"]
    legal_moves: list[str] = data["legal_moves"]  # use this — guaranteed correct
    time_ms: int = data.get("time_ms", 1000)
    # color: str = data["color"]  # "white" or "black"
    # turn:  str = data["turn"]   # "w" or "b"

    if not legal_moves:
        _respond("")
        return

    bestmove = search(fen, legal_moves, time_ms)
    _respond(bestmove)


def search(fen: str, legal_moves: list[str], time_ms: int) -> str:
    """
    Return the best move as a UCI string (e.g. "e2e4", "e7e8q").

    Parameters
    ----------
    fen        : current position (FEN). board.turn tells you which side you are.
    legal_moves: all legal moves for the side to move — safe to pick from directly.
    time_ms    : thinking budget in ms.
    """
    if not HAS_CHESS:
        return random.choice(legal_moves)

    board = chess.Board(fen)
    # board.turn == chess.WHITE when it's white's turn
    # board.turn == chess.BLACK when it's black's turn

    best_score = -math.inf
    best_move: "chess.Move | None" = None
    deadline = time.monotonic() + time_ms / 1000.0

    moves = list(board.legal_moves)
    random.shuffle(moves)

    for move in moves:
        if time.monotonic() > deadline:
            break
        board.push(move)
        score = -material(board)
        board.pop()
        if score > best_score:
            best_score = score
            best_move = move

    if best_move is None:
        best_move = random.choice(list(board.legal_moves))

    return best_move.uci()


PIECE_VALUES = {
    chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330,
    chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 0,
} if HAS_CHESS else {}


def material(board: "chess.Board") -> int:
    score = 0
    for pt, v in PIECE_VALUES.items():
        score += v * len(board.pieces(pt, board.turn))
        score -= v * len(board.pieces(pt, not board.turn))
    return score


def _respond(bestmove: str) -> None:
    print(json.dumps({"bestmove": bestmove}), flush=True)


def _fatal(message: str) -> None:
    print(f"[bot error] {message}", file=sys.stderr, flush=True)
    sys.exit(1)


if __name__ == "__main__":
    main()
