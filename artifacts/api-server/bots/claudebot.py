"""
chess_bot.py — UCI-protocol chess bot for custom platforms.

Protocol:
  stdin  → {"fen": "...", "moves": [...], "turn": "w", "time_ms": 1000}
  stdout ← {"bestmove": "g1f3"}

Requires: python-chess  (pip install chess)
"""

import sys
import json
import time
import chess

# ---------------------------------------------------------------------------
# OPENING BOOK
# ---------------------------------------------------------------------------
# Keys are FEN prefixes (piece placement + side to move only).
# Values are UCI move strings.  Add/remove as you like.

OPENING_BOOK: dict[str, list[str]] = {
    # 1.e4
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w": ["e2e4"],
    # 1…e5
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b": ["e7e5"],
    # 2.Nf3
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w": ["g1f3"],
    # 2…Nc6
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b": ["b8c6"],
    # 3.Bb5 (Ruy López)
    "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w": ["f1b5"],
    # 1.d4
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w": ["e2e4", "d2d4"],
    # Sicilian: 1…c5
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b": ["e7e5", "c7c5"],
    # French: 1…e6
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b": ["e7e5", "e7e6"],
}


def book_move(board: chess.Board) -> chess.Move | None:
    """Return a random opening-book move, or None if not in book."""
    import random

    key = " ".join(board.fen().split()[:2])
    candidates = OPENING_BOOK.get(key, [])
    random.shuffle(candidates)
    for uci in candidates:
        try:
            move = chess.Move.from_uci(uci)
            if move in board.legal_moves:
                return move
        except ValueError:
            pass
    return None


# ---------------------------------------------------------------------------
# PIECE VALUES  (centipawns)
# ---------------------------------------------------------------------------
PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
}

# ---------------------------------------------------------------------------
# PIECE-SQUARE TABLES  (from White's perspective, a1=index 0)
# ---------------------------------------------------------------------------
# fmt: off
_PAWN_PST = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
]
_KNIGHT_PST = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
]
_BISHOP_PST = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
]
_ROOK_PST = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
]
_QUEEN_PST = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
]
_KING_MID_PST = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
]
_KING_END_PST = [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50,
]
# fmt: on


def _mirror(table: list[int]) -> list[int]:
    """Flip a PST so it can be used for Black (rank mirror)."""
    mirrored = []
    for rank in range(7, -1, -1):
        mirrored.extend(table[rank * 8 : rank * 8 + 8])
    return mirrored


# Build lookup: PST[piece_type][color][square]
PST: dict[int, dict[int, list[int]]] = {}
for _pt, _tbl in [
    (chess.PAWN, _PAWN_PST),
    (chess.KNIGHT, _KNIGHT_PST),
    (chess.BISHOP, _BISHOP_PST),
    (chess.ROOK, _ROOK_PST),
    (chess.QUEEN, _QUEEN_PST),
]:
    PST[_pt] = {
        chess.WHITE: _tbl,
        chess.BLACK: _mirror(_tbl),
    }
# King has two tables (middle-game vs endgame)
PST[chess.KING] = {
    chess.WHITE: _KING_MID_PST,
    chess.BLACK: _mirror(_KING_MID_PST),
}
_KING_END = {
    chess.WHITE: _KING_END_PST,
    chess.BLACK: _mirror(_KING_END_PST),
}


# ---------------------------------------------------------------------------
# EVALUATION
# ---------------------------------------------------------------------------
ENDGAME_MATERIAL = PIECE_VALUES[chess.ROOK] * 2  # threshold for endgame


def _is_endgame(board: chess.Board) -> bool:
    """Rough endgame detection: no queens, or very little material."""
    queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + len(
        board.pieces(chess.QUEEN, chess.BLACK)
    )
    if queens == 0:
        return True
    minor_major = sum(
        len(board.pieces(pt, c))
        for pt in (chess.ROOK, chess.BISHOP, chess.KNIGHT)
        for c in (chess.WHITE, chess.BLACK)
    )
    return minor_major <= 2


def _material_and_pst(board: chess.Board, endgame: bool) -> int:
    """Sum material + PST scores for all pieces."""
    score = 0
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece is None:
            continue
        val = PIECE_VALUES[piece.piece_type]
        if piece.piece_type == chess.KING and endgame:
            pst_val = _KING_END[piece.color][sq]
        else:
            pst_val = PST[piece.piece_type][piece.color][sq]
        combined = val + pst_val
        if piece.color == chess.WHITE:
            score += combined
        else:
            score -= combined
    return score


def _pawn_structure(board: chess.Board) -> int:
    """Penalise doubled, isolated, and passed-pawn bonuses."""
    score = 0
    for color, sign in ((chess.WHITE, 1), (chess.BLACK, -1)):
        pawns = board.pieces(chess.PAWN, color)
        files: dict[int, int] = {}
        for sq in pawns:
            f = chess.square_file(sq)
            files[f] = files.get(f, 0) + 1

        for f, cnt in files.items():
            # Doubled pawns
            if cnt > 1:
                score -= sign * 20 * (cnt - 1)
            # Isolated pawns
            if (f - 1) not in files and (f + 1) not in files:
                score -= sign * 15

        # Passed pawn bonus
        opp_pawns = board.pieces(chess.PAWN, not color)
        opp_files: set[int] = {chess.square_file(sq) for sq in opp_pawns}
        for sq in pawns:
            f = chess.square_file(sq)
            r = chess.square_rank(sq)
            adjacent = {f - 1, f, f + 1} & opp_files
            if not adjacent:
                bonus = (r if color == chess.WHITE else 7 - r) * 10
                score += sign * bonus

    return score


def _king_safety(board: chess.Board, endgame: bool) -> int:
    """Simple king-safety: reward pawn shield, penalise open files."""
    if endgame:
        return 0  # King activity is good in endgame, handled by PST
    score = 0
    for color, sign in ((chess.WHITE, 1), (chess.BLACK, -1)):
        king_sq = board.king(color)
        if king_sq is None:
            continue
        king_file = chess.square_file(king_sq)
        king_rank = chess.square_rank(king_sq)
        # Pawn shield: count pawns directly in front of king
        shield_rank = king_rank + (1 if color == chess.WHITE else -1)
        if 0 <= shield_rank <= 7:
            for df in (-1, 0, 1):
                nf = king_file + df
                if 0 <= nf <= 7:
                    shield_sq = chess.square(nf, shield_rank)
                    p = board.piece_at(shield_sq)
                    if p and p.piece_type == chess.PAWN and p.color == color:
                        score += sign * 10
    return score


def _mobility(board: chess.Board) -> int:
    """Reward having more legal moves."""
    if board.turn == chess.WHITE:
        white_mob = board.legal_moves.count()
        board.push(chess.Move.null())
        black_mob = board.legal_moves.count() if not board.is_check() else 0
        board.pop()
    else:
        board.push(chess.Move.null())
        white_mob = board.legal_moves.count() if not board.is_check() else 0
        board.pop()
        black_mob = board.legal_moves.count()
    return (white_mob - black_mob) * 2


def _center_control(board: chess.Board) -> int:
    """Bonus for pieces/pawns controlling central squares."""
    CENTER = {chess.E4, chess.D4, chess.E5, chess.D5}
    score = 0
    for sq in CENTER:
        white_att = len(board.attackers(chess.WHITE, sq))
        black_att = len(board.attackers(chess.BLACK, sq))
        score += (white_att - black_att) * 5
    return score


def evaluate(board: chess.Board) -> int:
    """
    Static evaluation from White's perspective (centipawns).
    Positive = White is better; negative = Black is better.
    """
    if board.is_checkmate():
        return -100_000 if board.turn == chess.WHITE else 100_000
    if board.is_stalemate() or board.is_insufficient_material():
        return 0

    endgame = _is_endgame(board)
    score = 0
    score += _material_and_pst(board, endgame)
    score += _pawn_structure(board)
    score += _king_safety(board, endgame)
    score += _center_control(board)
    # Mobility is expensive; skip in deep search, include at shallow depths
    # (caller decides — we always include it here for correctness)
    score += _mobility(board)
    return score


# ---------------------------------------------------------------------------
# MOVE ORDERING
# ---------------------------------------------------------------------------
MVV_LVA: dict[tuple[int, int], int] = {}
for _victim in PIECE_VALUES:
    for _attacker in PIECE_VALUES:
        MVV_LVA[(_victim, _attacker)] = (
            10 * PIECE_VALUES[_victim] - PIECE_VALUES[_attacker]
        )


def _move_score(board: chess.Board, move: chess.Move) -> int:
    """Heuristic score for move ordering (higher = try first)."""
    score = 0
    # Promotions
    if move.promotion:
        score += PIECE_VALUES.get(move.promotion, 0)
    # Captures: MVV-LVA
    if board.is_capture(move):
        victim_piece = board.piece_at(move.to_square)
        attacker_piece = board.piece_at(move.from_square)
        if victim_piece and attacker_piece:
            score += MVV_LVA.get(
                (victim_piece.piece_type, attacker_piece.piece_type), 0
            )
        else:
            score += 100  # en-passant or edge case
    # Checks (mild bonus — costly to compute for every move)
    # Skipped intentionally to keep ordering fast.
    return score


def order_moves(board: chess.Board, moves) -> list[chess.Move]:
    return sorted(moves, key=lambda m: _move_score(board, m), reverse=True)


# ---------------------------------------------------------------------------
# QUIESCENCE SEARCH
# ---------------------------------------------------------------------------
def quiescence(
    board: chess.Board,
    alpha: int,
    beta: int,
    max_depth: int = 4,
) -> int:
    """Search only captures until quiet position, to avoid horizon effect."""
    stand_pat = evaluate(board)
    if board.turn == chess.BLACK:
        stand_pat = -stand_pat

    if stand_pat >= beta:
        return beta
    if stand_pat > alpha:
        alpha = stand_pat

    if max_depth == 0:
        return alpha

    captures = [m for m in board.legal_moves if board.is_capture(m)]
    for move in order_moves(board, captures):
        board.push(move)
        score = -quiescence(board, -beta, -alpha, max_depth - 1)
        board.pop()
        if score >= beta:
            return beta
        if score > alpha:
            alpha = score

    return alpha


# ---------------------------------------------------------------------------
# ALPHA-BETA MINIMAX
# ---------------------------------------------------------------------------
def negamax(
    board: chess.Board,
    depth: int,
    alpha: int,
    beta: int,
    deadline: float,
) -> int:
    """
    Negamax with alpha-beta pruning.
    Returns score from the perspective of the side to move.
    """
    if time.time() > deadline:
        raise TimeoutError

    if board.is_checkmate():
        return -100_000 - depth  # prefer quicker mates

    if (
        board.is_stalemate()
        or board.is_insufficient_material()
        or board.is_seventyfive_moves()
        or board.is_fivefold_repetition()
    ):
        return 0

    if depth == 0:
        score = quiescence(board, alpha, beta)
        return score

    moves = order_moves(board, board.legal_moves)
    if not moves:
        return 0  # no legal moves (shouldn't reach here normally)

    for move in moves:
        board.push(move)
        score = -negamax(board, depth - 1, -beta, -alpha, deadline)
        board.pop()
        if score >= beta:
            return beta  # cut-off
        if score > alpha:
            alpha = score

    return alpha


# ---------------------------------------------------------------------------
# ITERATIVE DEEPENING ROOT
# ---------------------------------------------------------------------------
MAX_DEPTH = 20  # will time-out well before this in most cases


def best_move(board: chess.Board, time_ms: int) -> chess.Move:
    """
    Find the best move using iterative deepening within the time budget.
    Reserves a small buffer so we always return before the deadline.
    """
    # Opening book
    bm = book_move(board)
    if bm:
        return bm

    legal = list(board.legal_moves)
    if not legal:
        raise ValueError("No legal moves available")
    if len(legal) == 1:
        return legal[0]

    # Allocate time: use 85% of given budget, keep 15% as safety margin
    budget_s = max(0.05, time_ms / 1000.0 * 0.85)
    deadline = time.time() + budget_s

    chosen = order_moves(board, legal)[0]  # fallback: highest-priority move

    for depth in range(1, MAX_DEPTH + 1):
        try:
            best_score = -10_000_000
            best_at_depth = chosen

            for move in order_moves(board, legal):
                if time.time() > deadline:
                    raise TimeoutError

                board.push(move)
                score = -negamax(board, depth - 1, -10_000_000, 10_000_000, deadline)
                board.pop()

                if score > best_score:
                    best_score = score
                    best_at_depth = move

            chosen = best_at_depth  # only update if depth completed fully

        except TimeoutError:
            break  # keep last fully-completed depth's result

    return chosen


# ---------------------------------------------------------------------------
# MAIN — stdin/stdout protocol
# ---------------------------------------------------------------------------
def main() -> None:
    raw = sys.stdin.readline()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        sys.stdout.write(json.dumps({"error": "invalid JSON"}) + "\n")
        sys.stdout.flush()
        return

    fen: str = data.get("fen", chess.STARTING_FEN)
    moves: list[str] = data.get("moves", [])
    time_ms: int = int(data.get("time_ms", 1000))

    board = chess.Board(fen)
    for uci in moves:
        try:
            board.push_uci(uci)
        except ValueError:
            pass  # skip invalid moves silently

    try:
        move = best_move(board, time_ms)
        result = {"bestmove": move.uci()}
    except Exception as exc:
        # Last resort: pick a random legal move
        legal = list(board.legal_moves)
        if legal:
            result = {"bestmove": legal[0].uci()}
        else:
            result = {"bestmove": "none", "error": str(exc)}

    sys.stdout.write(json.dumps(result) + "\n")
    sys.stdout.flush()


if __name__ == "__main__":
    main()
