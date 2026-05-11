# Chess Playground — Bot Development Guide

Bots are Python scripts that communicate with the server over stdin/stdout using JSON.

## Quick start

1. Copy `template_bot.py` to a new file, e.g. `my_engine.py`
2. Implement the `search()` function
3. In the playground UI, set the bot filename to `my_engine` (no `.py`)
4. Click the bot toggle — the engine starts immediately

## Protocol

The server sends **one JSON line** on stdin:

```json
{
  "fen":         "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "moves":       ["e2e4"],
  "legal_moves": ["e7e5", "d7d5", "g8f6", ...],
  "turn":        "b",
  "time_ms":     2000
}
```

| Field | Description |
|-------|-------------|
| `fen` | Current position in FEN notation |
| `moves` | Full move history in UCI format |
| `legal_moves` | All legal moves for the side to move (UCI) |
| `turn` | `"w"` or `"b"` |
| `time_ms` | Suggested thinking time in ms |

The bot must write **one JSON line** on stdout and exit:

```json
{"bestmove": "e7e5"}
```

Move format: UCI — `from + to`, e.g. `"e2e4"`. Promotion: append piece letter — `"e7e8q"`.

Return `{"bestmove": ""}` if there are no legal moves (the server handles this gracefully).

## Installing dependencies

```bash
pip install chess
```

Or install everything in `requirements.txt`:

```bash
pip install -r artifacts/api-server/bots/requirements.txt
```

## Available libraries

| Library | Import | Notes |
|---------|--------|-------|
| `python-chess` | `import chess` | Board, legal moves, FEN/PGN, opening books, Syzygy/Gaviota tablebases |
| `chess.polyglot` | `import chess.polyglot` | Polyglot opening book support |
| `chess.syzygy` | `import chess.syzygy` | 7-piece Syzygy tablebase |
| `chess.gaviota` | `import chess.gaviota` | Gaviota tablebase |
| `json` | built-in | Protocol I/O |
| `sys` | built-in | stdin/stdout |
| `time` | built-in | Time management |
| `random` | built-in | Move randomisation |
| `math` | built-in | Alpha-beta, scores |

## Rules

1. **Only write to stdout once** — one JSON line, then exit.
2. **Never print debug output to stdout** — use `sys.stderr` for debugging.
3. **Respect `time_ms`** — return before the deadline or the server will kill the process.
4. **Only return legal moves** — the server validates the move and returns HTTP 422 on illegal moves.
5. **Flush stdout** — always use `flush=True` or `sys.stdout.flush()`.

## Example: random bot (no dependencies)

```python
import sys, json, random

data = json.loads(sys.stdin.readline())
legal = data.get("legal_moves", [])
bestmove = random.choice(legal) if legal else ""
print(json.dumps({"bestmove": bestmove}), flush=True)
```

## Example: capture-first bot (python-chess)

```python
import sys, json, chess

data = json.loads(sys.stdin.readline())
board = chess.Board(data["fen"])
captures = [m for m in board.legal_moves if board.is_capture(m)]
pool = captures if captures else list(board.legal_moves)
move = pool[0] if pool else None
bestmove = move.uci() if move else ""
print(json.dumps({"bestmove": bestmove}), flush=True)
```

## Debugging

Stderr output is captured by the server and included in error messages shown in the UI Engine Console panel.

```python
import sys
print("[debug] evaluating position", file=sys.stderr, flush=True)
```

## File location

All bot files must be placed in:

```
artifacts/api-server/bots/<your_bot>.py
```
