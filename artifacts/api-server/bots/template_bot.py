"""
template_bot.py — Official Chess Playground Bot Template

Protocol (JSON over stdin/stdout):
  stdin:  {"fen": "...", "moves": [...], "legal_moves": [...],
           "turn": "w"|"b", "color": "white"|"black", "time_ms": 1000}
  stdout: {"bestmove": "e2e4"}   (UCI move string, e.g. "e7e8q" for promotion)

Key protocol fields
-------------------
  legal_moves — ALREADY FILTERED for the side to move by the server.
                Always pick from this list to avoid illegal-move errors.
                This is the safest approach and avoids color-confusion bugs.

  turn        — "w" or "b"  (same as python-chess board.turn: chess.WHITE/chess.BLACK)
  color       — "white" or "black"  — unambiguous human-readable alias.
                Use this if you find "w"/"b" confusing.

  fen         — current board position (FEN).  board.turn already encodes the side.
  time_ms     — your thinking budget in ms. Return before this expires.
  moves       — full game move history in UCI format (useful for opening books).

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

# ── Optional: python-chess ─────────────────────────────────────────────────────
try:
    import chess
    HAS_CHESS = True
except ImportError:
    HAS_CHESS = False


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    raw = sys.stdin.readline()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        _fatal(f"Failed to parse input JSON: {exc}")

    fen: str = data.get("fen", "")
    legal_moves: list[str] = data.get("legal_moves", [])  # already for side to move
    time_ms: int = data.get("time_ms", 1000)

    # NOTE: use data["color"] ("white"/"black") or data["turn"] ("w"/"b")
    # to know which side you are playing. Both refer to the same thing.
    # color: str = data.get("color", "white")   # "white" or "black"
    # turn:  str = data.get("turn",  "w")        # "w" or "b"

    if not legal_moves:
        _respond("")
        return

    bestmove = search(fen, legal_moves, time_ms)
    _respond(bestmove)


# ═══════════════════════════════════════════════════════════════════════════════
# SEARCH  ← implement your engine here
# ═══════════════════════════════════════════════════════════════════════════════

def search(fen: str, legal_moves: list[str], time_ms: int) -> str:
    """
    Return the best move as a UCI string (e.g. "e2e4", "e7e8q").

    Parameters
    ----------
    fen        : current position in FEN notation
    legal_moves: list of all legal moves in UCI format (provided by the server,
                 already filtered for the side to move — safe to pick from directly)
    time_ms    : suggested thinking time in milliseconds

    The simplest possible engine just picks randomly.  Replace this with
    your own evaluation + search.
    """
    if not HAS_CHESS:
        # Fallback: random move from the server-provided legal list
        return random.choice(legal_moves)

    board = chess.Board(fen)
    # board.turn == chess.WHITE  when it's white's turn
    # board.turn == chess.BLACK  when it's black's turn

    # Example: one-ply material evaluation
    best_score = -math.inf
    best_move: "chess.Move | None" = None
    deadline = time.monotonic() + time_ms / 1000.0

    moves = list(board.legal_moves)
    random.shuffle(moves)  # randomise tie-breaking

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


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

PIECE_VALUES = {
    chess.PAWN:   100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK:   500,
    chess.QUEEN:  900,
    chess.KING:   0,
} if HAS_CHESS else {}


def material(board: "chess.Board") -> int:
    """Return material balance from the perspective of the side to move."""
    score = 0
    for piece_type, value in PIECE_VALUES.items():
        score += value * len(board.pieces(piece_type, board.turn))
        score -= value * len(board.pieces(piece_type, not board.turn))
    return score


# ═══════════════════════════════════════════════════════════════════════════════
# I/O HELPERS  — do not modify
# ═══════════════════════════════════════════════════════════════════════════════

def _respond(bestmove: str) -> None:
    """Write the response to stdout and flush immediately."""
    print(json.dumps({"bestmove": bestmove}), flush=True)


def _fatal(message: str) -> None:
    """Write an error to stderr and exit with a non-zero code."""
    print(f"[bot error] {message}", file=sys.stderr, flush=True)
    sys.exit(1)


if __name__ == "__main__":
    main()
