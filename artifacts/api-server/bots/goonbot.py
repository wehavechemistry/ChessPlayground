import chess
import json
import sys
import time

# --- Evaluation Constants ---
PIECE_VALUES = {
    chess.PAWN: 95,
    chess.KNIGHT: 315,
    chess.BISHOP: 325,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}
KING_MG = [
    -80,-70,-70,-70,-70,-70,-70,-80,
    -60,-60,-60,-60,-60,-60,-60,-60,
    -40,-50,-50,-60,-60,-50,-50,-40,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
]
KING_EG = [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50
]
# Simplified Piece-Square Tables (PST)
# Oriented for White (will be flipped for Black)
PST = {
    chess.PAWN: [
        0,  0,  0,  0,  0,  0,  0,  0,
        80, 80, 80, 80, 80, 80, 80, 80,
        30, 30, 40, 50, 50, 40, 30, 30,
        20, 20, 30, 40, 40, 30, 20, 20,
        10, 10, 30, 50, 50, 30, 10, 10,
        5, -5,-10,  0,  0,-10, -5,  5,
        5, 10, 10,-20,-20, 10, 10,  5,
        0,  0,  0,  0,  0,  0,  0,  0
    ],
    chess.KNIGHT: [
        -30,-20,-20,-20,-20,-20,-20,-30,
        -20,-20, -5, -5, -5, -5,-20,-20,
        -20, -5, 10, 15, 15, 10, -5,-20,
        -20,  0, 15, 20, 20, 15,  0,-20,
        -20,  0, 15, 20, 20, 15,  0,-20,
        -20, -5, 10, 15, 15, 10, -5,-20,
        -20,-20,  0,  0,  0,  0,-20,-20,
        -30,-20,-20,-20,-20,-20,-20,-30
    ],
    chess.BISHOP: [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10,  5, 10, 15, 15, 10,  5,-10,
        -10,  0, 20, 20, 20, 20,  0,-10,
        -10, 10, 20, 20, 20, 20, 10,-10,
         10,  5,  0,  0,  0,  0,  5, 10,
        -20,-10,-10,-10,-10,-10,-10,-20
    ],
    chess.ROOK: [
        0,  0,  0,  0,  0,  0,  0,  0,
        5, 10, 10, 15, 15, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        0,  0,  0,  10,  10,  0,  0,  0
    ],
    chess.QUEEN: [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  5,  0,  0,  5,  0,-10,
        -10,  5,  5,  5,  5,  5,  5,-10,
        -5,  0,  5,  5,  5,  5,  0, -5,
        -5,  0,  5,  5,  5,  5,  0, -5,
        -10,  0,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  5,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    ],
    chess.KING: [
        -50,-40,-30,-20,-20,-30,-40,-50,
        -40,-30,-20,-10,-10,-20,-30,-40,
        -30,-20,-10,  0,  0,-10,-20,-30,
        -20,-10,  0, 10, 10,  0,-10,-20,
        -10,  0, 10, 20, 20, 10,  0,-10,
        0,  10, 20, 30, 30, 20, 10,  0,
        10, 20, 30, 40, 40, 30, 20, 10,
        20, 30, 40, 50, 50, 40, 30, 20
    ]
}

class ChessEngine:
    def __init__(self, board):
        self.board = board
        self.transposition_table = {}
        self.start_time = 0
        self.time_limit = 0

    def evaluate(self):
        if self.board.is_checkmate():
            return -30000
        if self.board.is_stalemate() or self.board.is_insufficient_material():
            return 0

        score = 0

        # Phase for endgame scaling
        pawn_count = len(self.board.pieces(chess.PAWN, chess.WHITE)) + len(self.board.pieces(chess.PAWN, chess.BLACK))
        non_pawn_count = len(self.board.piece_map()) - pawn_count
        total_material = 0
        for piece in self.board.piece_map().values():
            if piece.piece_type != chess.PAWN and piece.piece_type != chess.KING:
                total_material += PIECE_VALUES[piece.piece_type]

        is_endgame = total_material <= 2600

        # Positional evaluation setup for pawns and files
        white_pawns_squares = {sq for sq in self.board.pieces(chess.PAWN, chess.WHITE)}
        black_pawns_squares = {sq for sq in self.board.pieces(chess.PAWN, chess.BLACK)}

        white_pawn_files = {chess.square_file(sq) for sq in white_pawns_squares}
        black_pawn_files = {chess.square_file(sq) for sq in black_pawns_squares}

        all_pawn_files = white_pawn_files.union(black_pawn_files)

        for square, piece in self.board.piece_map().items():
            val = PIECE_VALUES[piece.piece_type]

            # PST index management
            idx = square if piece.color == chess.BLACK else chess.square_mirror(square)
            if piece.piece_type == chess.KING:
                pst_val = KING_EG[idx] if is_endgame else KING_MG[idx]
            else:
                pst_val = PST[piece.piece_type][idx]

            if piece.color == chess.WHITE:
                score += val + pst_val
                # Mobility
                if piece.piece_type != chess.PAWN:
                    score += len(self.board.attacks(square)) * 1
                attackers = self.board.attackers(not piece.color, square)

                defenders = self.board.attackers(piece.color, square)

                if attackers and not defenders:
                    if piece.color == chess.WHITE:
                        score -= val // 2
                    else:
                        score += val // 2
                # --- Positional Evaluation for White Pieces ---
                if piece.piece_type == chess.PAWN:
                    file = chess.square_file(square)
                    rank = chess.square_rank(square)

                    # Isolated Pawn
                    is_isolated = True
                    if (file > 0 and (file - 1) in white_pawn_files) or \
                       (file < 7 and (file + 1) in white_pawn_files):
                        is_isolated = False

                    if is_isolated:
                        score -= 20

                    # Doubled Pawn
                    num_pawns_on_file = sum(1 for p_sq in white_pawns_squares if chess.square_file(p_sq) == file)
                    if num_pawns_on_file > 1:
                        score -= 30

                    # Passed Pawn
                    is_passed = True
                    for r in range(rank + 1, 8):
                        for f_offset in [-1, 0, 1]:
                            test_file = file + f_offset
                            if 0 <= test_file <= 7:
                                if chess.square(test_file, r) in black_pawns_squares:
                                    is_passed = False
                                    break
                        if not is_passed: break

                    if is_passed:
                        score += 50 + (rank * 10) # Bonus for passed pawn, stronger if advanced

                        # Protected Passed Pawn
                        is_protected = False
                        if rank > 0: # Cannot be protected by pawn on same rank
                            if file > 0 and chess.square(file - 1, rank - 1) in white_pawns_squares:
                                is_protected = True
                            if file < 7 and chess.square(file + 1, rank - 1) in white_pawns_squares:
                                is_protected = True

                        if is_protected:
                            score += 25

                elif piece.piece_type == chess.ROOK:
                    file = chess.square_file(square)

                    # Open File
                    is_open_file = file not in all_pawn_files
                    if is_open_file:
                        score += 40
                    else:
                        # Semi-Open File
                        if file not in white_pawn_files and file in black_pawn_files:
                            score += 20

                # Endgame: push pawns forward, especially passed pawns
                if piece.piece_type == chess.PAWN and is_endgame:
                    rank = chess.square_rank(square)
                    score += rank * 50  # Strong bonus for advanced pawns
            else: # BLACK
                score -= (val + pst_val)
                # Mobility
                if piece.piece_type != chess.PAWN:
                    score -= len(self.board.attacks(square)) * 2

                # --- Positional Evaluation for Black Pieces ---
                if piece.piece_type == chess.PAWN:
                    file = chess.square_file(square)
                    rank = chess.square_rank(square)

                    # Isolated Pawn
                    is_isolated = True
                    if (file > 0 and (file - 1) in black_pawn_files) or \
                       (file < 7 and (file + 1) in black_pawn_files):
                        is_isolated = False

                    if is_isolated:
                        score += 20 # Penalty applied as positive for black, then subtracted from total score later

                    # Doubled Pawn
                    num_pawns_on_file = sum(1 for p_sq in black_pawns_squares if chess.square_file(p_sq) == file)
                    if num_pawns_on_file > 1:
                        score += 30

                    # Passed Pawn
                    is_passed = True
                    for r in range(rank - 1, -1, -1):
                        for f_offset in [-1, 0, 1]:
                            test_file = file + f_offset
                            if 0 <= test_file <= 7:
                                if chess.square(test_file, r) in white_pawns_squares:
                                    is_passed = False
                                    break
                        if not is_passed: break

                    if is_passed:
                        score -= (50 + (7 - rank) * 10)

                        # Protected Passed Pawn
                        is_protected = False
                        if rank < 7:
                            if file > 0 and chess.square(file - 1, rank + 1) in black_pawns_squares:
                                is_protected = True
                            if file < 7 and chess.square(file + 1, rank + 1) in black_pawns_squares:
                                is_protected = True

                        if is_protected:
                            score -= 25

                elif piece.piece_type == chess.ROOK:
                    file = chess.square_file(square)

                    # Open File
                    is_open_file = file not in all_pawn_files
                    if is_open_file:
                        score -= 40
                    else:
                        # Semi-Open File
                        if file not in black_pawn_files and file in white_pawn_files:
                            score -= 20

                # Endgame: push pawns forward
                if piece.piece_type == chess.PAWN and is_endgame:
                    rank = 7 - chess.square_rank(square)
                    score -= rank * 50

        # Endgame king activity: drive enemy king to edges
        if is_endgame:
            white_king_sq = self.board.king(chess.WHITE)
            black_king_sq = self.board.king(chess.BLACK)

            # Distance between kings (closer is better for checkmate)
            king_distance = abs(chess.square_file(white_king_sq) - chess.square_file(black_king_sq))
            king_distance += abs(chess.square_rank(white_king_sq) - chess.square_rank(black_king_sq))
            score += (14 - king_distance) * 30  # Reward closeness

            # Drive black king to edges/corners
            black_king_rank = chess.square_rank(black_king_sq)
            black_king_file = chess.square_file(black_king_sq)
            edge_distance = min(black_king_rank, 7 - black_king_rank, black_king_file, 7 - black_king_file)
            score += (4 - edge_distance) * 50  # Strong bonus for cornering enemy king

            # Drive white king away from edges (center it first for mating attacks)
            white_king_rank = chess.square_rank(white_king_sq)
            white_king_file = chess.square_file(white_king_sq)
            white_edge_distance = min(white_king_rank, 7 - white_king_rank, white_king_file, 7 - white_king_file)
            if edge_distance > 1:  # Only centralize if not already pushing to edge
                score -= (4 - white_edge_distance) * 20

        # Center Control (simplified)
        center_squares = [chess.E4, chess.D4, chess.E5, chess.D5]
        for sq in center_squares:
            if self.board.is_attacked_by(chess.WHITE, sq): score += 10
            if self.board.is_attacked_by(chess.BLACK, sq): score -= 10

        return score if self.board.turn == chess.WHITE else -score

    def move_priority(self, move):
        # Move ordering: PV Move > Captures (MVV-LVA) > Checks > Others
        if self.board.is_capture(move):
            victim = self.board.piece_at(move.to_square)
            attacker = self.board.piece_at(move.from_square)
            return 100 + (
                PIECE_VALUES.get(victim.piece_type if victim else 0, 0)
                - PIECE_VALUES.get(attacker.piece_type if attacker else 0, 0)
            ) // 10
        if self.board.gives_check(move):
            return 50
        return 0

    def quiescence_search(self, alpha, beta,depth = 4):
        if depth == 0:
            return self.evaluate()
        if time.perf_counter() - self.start_time > self.time_limit:
            raise TimeoutError()
        stand_pat = self.evaluate()
        if stand_pat >= beta:
            return beta
        if alpha < stand_pat:
            alpha = stand_pat

        moves = []

        moves = list(self.board.generate_legal_captures())
        moves.sort(key=self.move_priority, reverse=True)
        moves = moves[:8]

        for move in sorted(moves, key=self.move_priority, reverse=True):
            self.board.push(move)
            score = -self.quiescence_search(-beta, -alpha, depth - 1)
            self.board.pop()

            if score >= beta:
                return beta
            if score > alpha:
                alpha = score
        return alpha

    def negamax(self, depth, alpha, beta):
        # TT Lookup
        board_hash = self.board._transposition_key()
        if board_hash in self.transposition_table:
            entry = self.transposition_table[board_hash]
            if entry['depth'] >= depth:
                return entry['score']

        if depth == 0:
            return self.quiescence_search(alpha, beta)

        if time.perf_counter() - self.start_time > self.time_limit:
            raise TimeoutError()

        best_score = -float('inf')
        moves = list(self.board.legal_moves)
        moves.sort(key=self.move_priority, reverse=True)

        if not moves:
            if self.board.is_check(): return -20000 - depth
            return 0
        for move in moves:
            if self.board.gives_check(move):
                self.board.push(move)
                if self.board.is_checkmate():
                    self.board.pop()
                    return 30000 - depth
                self.board.pop()
        for move in moves:
            self.board.push(move)
            score = -self.negamax(depth - 1, -beta, -alpha)
            self.board.pop()

            if score > best_score:
                best_score = score
            if score > alpha:
                alpha = score
            if alpha >= beta:
                break

        self.transposition_table[board_hash] = {'score': best_score, 'depth': depth}
        return best_score

    def search(self, time_ms):
        self.transposition_table.clear()
        self.start_time = time.perf_counter()
        self.time_limit = (time_ms / 1000.0) * 0.9  # Use 90% of available time
        legal_moves = list(self.board.legal_moves)

        if not legal_moves:
            return None

        best_move = legal_moves[0]

        # Iterative Deepening
        try:
            for depth in range(1, 10):  # Maximum depth 10
                current_best_score = -float('inf')
                inner_best_move = best_move

                moves = list(self.board.legal_moves)
                moves.sort(key=self.move_priority, reverse=True)
                for move in moves:
                    self.board.push(move)
                    try:
                        score = -self.negamax(depth - 1, -float('inf'), float('inf'))
                    except TimeoutError:
                        self.board.pop()
                        raise TimeoutError()
                    self.board.pop()

                    if score > current_best_score:
                        current_best_score = score
                        inner_best_move = move

                best_move = inner_best_move
        except TimeoutError:
            pass

        return best_move

def main():
    # Read input
    line = sys.stdin.readline()
    if not line:
        return

    try:
        data = json.loads(line)
        fen = data.get("fen")
        moves = data.get("moves", [])
        time_ms = data.get("time_ms", 1000)

        # Initialize board
        board = chess.Board(fen)
        for move_uci in moves:
            board.push_uci(move_uci)

        # Find best move
        engine = ChessEngine(board)
        best_move = engine.search(time_ms)

        # Output result
        response = {"bestmove": best_move.uci()}
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()

    except Exception:
        # Fallback to avoid crashing the platform
        board = chess.Board() # Default FEN
        best_move = next(iter(board.legal_moves))
        sys.stdout.write(json.dumps({"bestmove": best_move.uci()}) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()