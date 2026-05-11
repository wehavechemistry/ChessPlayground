"""
template_bot.py — Official Chess Playground Bot Template

Protocol (JSON over stdin/stdout):
  stdin:  {"fen": "...", "moves": [...], "legal_moves": [...], "turn": "w"|"b", "time_ms": 2000}
  stdout: {"bestmove": "e2e4"}   (UCI move string, e.g. "e7e8q" for promotion)

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
    import chess.polyglot
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
    legal_moves: list[str] = data.get("legal_moves", [])
    time_ms: int = data.get("time_ms", 2000)

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
    legal_moves: list of all legal moves in UCI format (provided by the server)
    time_ms    : suggested thinking time in milliseconds

    The simplest possible engine just picks randomly.  Replace this with
    your own evaluation + search.
    """
    if not HAS_CHESS:
        # Fallback: random move from the server-provided legal list
        return random.choice(legal_moves)

    board = chess.Board(fen)

    # Example: one-ply material evaluation
    best_score = -math.inf
    best_move = None
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


def move_order_key(board: "chess.Board", move: "chess.Move") -> int:
    """Simple move-ordering: captures first, then checks, then quiet moves."""
    if board.is_capture(move):
        victim = board.piece_at(move.to_square)
        attacker = board.piece_at(move.from_square)
        v = PIECE_VALUES.get(victim.piece_type, 0) if victim else 0
        a = PIECE_VALUES.get(attacker.piece_type, 100) if attacker else 100
        return -(v - a // 10 + 1000)
    board.push(move)
    is_check = board.is_check()
    board.pop()
    return -500 if is_check else 0


def is_game_over(board: "chess.Board") -> bool:
    return board.is_game_over(claim_draw=True)


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
