import chess,json,sys,time
# --- Evaluation Constants ---
PIECE_VALUES = {
    chess.PAWN: 95,
    chess.KNIGHT: 315,
    chess.BISHOP: 325,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}

# Simplified Piece-Square Tables (PST)
# Oriented for White (will be flipped for Black)
PST = {
    chess.PAWN: [
        0,  0,  0,  0,  0,  0,  0,  0,
        80, 80, 80, 80, 80, 80, 80, 80,
        30, 30, 40, 50, 50, 40, 30, 30,
        20, 20, 30, 40, 40, 30, 20, 20,
        10, 10, 30, 55, 50, 30, 10, 10,
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
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 20, 20, 20, 20,  0,-10,
        -10, 20, 20, 20, 20, 20, 10,-10,
         0,  5,  0,  0,  0,  0,  5,  0,
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
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
        -5,  0,  5,  5,  5,  5,  0, -5,
        0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    ],
    chess.KING: [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
        20, 20,  0,  0,  0,  0, 20, 20,
        20, 30, 10,  0,  0, 10, 30, 20
    ]
}

class ChessEngine:
    def __init__(self, board):
        self.board = board
        self.transposition_table = {}
        self.start_time = 0
        self.time_limit = 0

    def evaluate(self):
        opening = len(self.board.piece_map()) > 28
        if self.board.is_checkmate():
            return -30000 if self.board.turn == chess.WHITE else 30000
        if self.board.is_stalemate() or self.board.is_insufficient_material():
            return 0

        score = 0

        # Phase for endgame scaling
        pawn_count = len(self.board.pieces(chess.PAWN, chess.WHITE)) + len(self.board.pieces(chess.PAWN, chess.BLACK))
        non_pawn_count = len(self.board.piece_map()) - pawn_count

        for square, piece in self.board.piece_map().items():
            val = PIECE_VALUES[piece.piece_type]

            # PST index management
            idx = square if piece.color == chess.BLACK else chess.square_mirror(square)
            pst_val = PST[piece.piece_type][idx]

            if piece.color == chess.WHITE:
                score += val + pst_val
                # Mobility
                if piece.piece_type != chess.PAWN:
                    score += len(self.board.attacks(square)) * 2
            else:
                score -= (val + pst_val)
                # Mobility
                if piece.piece_type != chess.PAWN:
                    if opening:
                        file = chess.square_file(square)

                        # center pawns (c, d, e, f) = important
                        if file in (2, 3, 4, 5):
                            score += 30
                        else:
                            score += 2
                    score -= len(self.board.attacks(square)) * 2

        # Center Control (simplified)
        center_squares = [chess.E4, chess.D4, chess.E5, chess.D5]
        for sq in center_squares:
            if self.board.is_attacked_by(chess.WHITE, sq): score += 10
            if self.board.is_attacked_by(chess.BLACK, sq): score -= 10

        return score

    def move_priority(self, move):
        # Move ordering: PV Move > Captures (MVV-LVA) > Checks > Others
        if self.board.is_capture(move):
            victim = self.board.piece_at(move.to_square)
            attacker = self.board.piece_at(move.from_square)
            return 100 + (PIECE_VALUES.get(victim.piece_type if victim else 0, 0) - 
                          PIECE_VALUES.get(attacker.piece_type if attacker else 0, 0) // 10)
        if self.board.gives_check(move):
            return 50
        return 0

    def quiescence_search(self, alpha, beta):
        stand_pat = self.evaluate() if self.board.turn == chess.WHITE else -self.evaluate()
        if stand_pat >= beta:
            return beta
        if alpha < stand_pat:
            alpha = stand_pat

        for move in sorted(self.board.generate_legal_captures(), key=self.move_priority, reverse=True):
            self.board.push(move)
            score = -self.quiescence_search(-beta, -alpha)
            self.board.pop()

            if score >= beta:
                return beta
            if score > alpha:
                alpha = score
        return alpha

    def negamax(self, depth, alpha, beta):
        # TT Lookup
        board_hash = hash(self.board.fen())
        if board_hash in self.transposition_table:
            entry = self.transposition_table[board_hash]
            if entry['depth'] >= depth:
                return entry['score']

        if depth == 0:
            return self.quiescence_search(alpha, beta)

        if time.perf_counter() - self.start_time > self.time_limit:
            raise TimeoutError()

        best_score = -float('inf')
        moves = sorted(self.board.legal_moves, key=self.move_priority, reverse=True)

        if not moves:
            if self.board.is_check(): return -20000 - depth
            return 0

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
        self.start_time = time.perf_counter()
        self.time_limit = (time_ms / 1000.0) * 0.9  # Use 90% of available time
        best_move = next(iter(self.board.legal_moves))

        # Iterative Deepening
        try:
            for depth in range(1, 10):  # Maximum depth 10
                current_best_score = -float('inf')
                inner_best_move = best_move

                moves = sorted(self.board.legal_moves, key=self.move_priority, reverse=True)
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