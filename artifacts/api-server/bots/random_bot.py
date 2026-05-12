"""
random_bot.py — Example Python bot for Chess Playground

Protocol:
  stdin:  one JSON line with keys: fen, legal_moves, turn, color, time_ms
  stdout: one JSON line with key:  bestmove  (UCI format, e.g. "e2e4")

Fields:
  fen         — current position in FEN (encodes position + side to move + castling + en passant)
  legal_moves — all legal UCI moves for the side to move (pre-computed from FEN by the server)
  turn        — "w" or "b"  (matches python-chess board.turn)
  color       — "white" or "black"  (human-readable alias for turn)
  time_ms     — suggested thinking time budget in milliseconds

IMPORTANT: Always pick your move from legal_moves — they are guaranteed correct.
Do NOT reconstruct legal moves yourself unless you trust your board setup is correct.

Requires no external libraries.
"""

import sys
import json
import random


def main() -> None:
    line = sys.stdin.readline()
    data = json.loads(line)

    legal = data.get("legal_moves", [])
    if not legal:
        print(json.dumps({"bestmove": ""}), flush=True)
        return

    bestmove = random.choice(legal)
    print(json.dumps({"bestmove": bestmove}), flush=True)


if __name__ == "__main__":
    main()
