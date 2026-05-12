"""
random_bot.py — Example Python bot for Chess Playground

Protocol:
  stdin:  one JSON line with keys: fen, moves, legal_moves, turn, color, time_ms
  stdout: one JSON line with key:  bestmove  (UCI format, e.g. "e2e4")

Fields:
  legal_moves — list of all legal UCI moves for the side to move (safest to use this)
  turn        — "w" or "b"  (matches chess.js / python-chess board.turn)
  color       — "white" or "black"  (human-readable alias for turn)
  fen         — current position in FEN notation
  time_ms     — suggested thinking time budget in milliseconds

Requires no external libraries — uses the legal_moves list provided by the server.
"""

import sys
import json
import random


def main() -> None:
    line = sys.stdin.readline()
    data = json.loads(line)

    legal = data.get("legal_moves", [])
    if not legal:
        # No legal moves — game is over; return empty (server handles gracefully)
        print(json.dumps({"bestmove": ""}), flush=True)
        return

    bestmove = random.choice(legal)
    print(json.dumps({"bestmove": bestmove}), flush=True)


if __name__ == "__main__":
    main()
