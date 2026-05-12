import sys
import json
import time
import random
import chess

# --- Piece-Square Tables (PST) ---
# Aligned with python-chess: index 0 is A1, index 63 is H8.
# These tables encourage center control and development.
PST = {
    chess.PAWN: [
         0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10,-20,-20, 10, 10,  5,
         5, -5,-10,  0,  0,-10, -5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5,  5, 10, 25, 25, 10,  5,  5,
        10, 10, 20, 30, 30, 20, 10, 10,
        50, 50, 50, 50, 50, 50, 50, 50,
         0,  0,  0,  0,  0,  0,  0,  0
    ],
    chess.KNIGHT: [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    ],
    chess.BISHOP: [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    ],
    chess.ROOK: [
         0,  0,  0,  5,  5,  0,  0,  0,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         5, 10, 10, 10, 10, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0
    ],
    chess.QUEEN: [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -10,  5,  5,  5,  5,  5,  0,-10,
         0,  0,  5,  5,  5,  5,  0, -5,
        -5,  0,  5,  5,  5,  5,  0, -5,
        -10,  0,  5,  5,  5,  5,  0,-10,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    ],
    chess.KING: [
        20, 30, 10,  0,  0, 10, 30, 20,
        20, 20,  0,  0,  0,  0, 20, 20,
        -10,-20,-20,-20,-20,-20,-20,-10,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30
    ]
}

PIECE_VALUES = {
    chess.PAWN: 100, chess.KNIGHT: 320, chess.BISHOP: 330,
    chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 20000
}

class Engine:
    def __init__(self):
        self.board = None
        self.nodes = 0
        self.time_limit = 0
        self.start_time = 0

    def evaluate(self):
        if self.board.is_checkmate():
            return -30000 if self.board.turn else 30000
        if self.board.is_draw():
            return 0

        score = 0
        for sq, pc in self.board.piece_map().items():
            val = PIECE_VALUES[pc.piece_type]
            # Use mirrored square for black pieces
            idx = sq if pc.color == chess.WHITE else chess.square_mirror(sq)
            pst_val = PST[pc.piece_type][idx]

            if pc.color == chess.WHITE:
                score += (val + pst_val)
            else:
                score -= (val + pst_val)

        return score if self.board.turn == chess.WHITE else -score

    def quiescence(self, alpha, beta):
        self.nodes += 1
        stand_pat = self.evaluate()
        if stand_pat >= beta: return beta
        if alpha < stand_pat: alpha = stand_pat

        for move in self.board.legal_moves:
            if self.board.is_capture(move):
                self.board.push(move)
                score = -self.quiescence(-beta, -alpha)
                self.board.pop()
                if score >= beta: return beta
                if score > alpha: alpha = score
        return alpha

    def negamax(self, depth, alpha, beta):
        self.nodes += 1
        if self.nodes % 1024 == 0:
            if (time.time() - self.start_time) * 1000 > self.time_limit:
                raise TimeoutError()

        if depth <= 0:
            return self.quiescence(alpha, beta)

        if self.board.is_checkmate(): return -20000 - depth
        if self.board.is_draw(): return 0

        best_score = -float('inf')
        # Simple move ordering: captures first
        moves = sorted(self.board.legal_moves, key=lambda m: self.board.is_capture(m), reverse=True)

        for move in moves:
            self.board.push(move)
            try:
                score = -self.negamax(depth - 1, -beta, -alpha)
            finally:
                self.board.pop()

            if score > best_score:
                best_score = score
            alpha = max(alpha, score)
            if alpha >= beta:
                break
        return best_score

    def search(self, fen, time_ms):
        self.board = chess.Board(fen)
        self.start_time = time.time()
        self.time_limit = time_ms * 0.8 # Safety margin
        self.nodes = 0

        best_move = random.choice(list(self.board.legal_moves))

        try:
            for depth in range(1, 10): # Iterative deepening
                current_best = None
                alpha, beta = -float('inf'), float('inf')
                moves = sorted(self.board.legal_moves, key=lambda m: self.board.is_capture(m), reverse=True)

                for move in moves:
                    self.board.push(move)
                    try:
                        score = -self.negamax(depth - 1, -beta, -alpha)
                    finally:
                        self.board.pop()

                    if score > alpha:
                        alpha = score
                        current_best = move

                if current_best:
                    best_move = current_best
        except TimeoutError:
            pass

        return best_move

def main():
    engine = Engine()
    while True:
        line = sys.stdin.readline()
        if not line: break

        try:
            data = json.loads(line)
            fen = data.get("fen")
            time_ms = data.get("time_ms", 1000)
            platform_legal = data.get("legal_moves", []) # Extra safety

            if not fen: continue

            # 1. Initialize local board from FEN
            board = chess.Board(fen)
            print(f"DEBUG: FEN={fen} Turn={'W' if board.turn else 'B'}", file=sys.stderr)

            # 2. Search for best move
            move = engine.search(fen, time_ms)

            # 3. Double-check move legality against python-chess
            if move not in board.legal_moves:
                print(f"DEBUG: Search returned illegal {move}, falling back.", file=sys.stderr)
                move = random.choice(list(board.legal_moves))

            # 4. Final verification against platform's own legal_moves if provided
            move_uci = move.uci()
            if platform_legal and move_uci not in platform_legal:
                print(f"DEBUG: UCI {move_uci} not in platform list. Picking random from platform.", file=sys.stderr)
                move_uci = random.choice(platform_legal)

            # 5. Output ONLY the JSON
            sys.stdout.write(json.dumps({"bestmove": move_uci}) + "\n")
            sys.stdout.flush()
            print(f"DEBUG: Move Sent={move_uci}", file=sys.stderr)

        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr)
            # Last resort fallback to avoid engine crash
            try:
                fallback_board = chess.Board(data.get("fen"))
                move = random.choice(list(fallback_board.legal_moves)).uci()
                sys.stdout.write(json.dumps({"bestmove": move}) + "\n")
                sys.stdout.flush()
            except:
                pass

if __name__ == "__main__":
    main()