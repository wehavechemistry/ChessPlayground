import sys
import json
import time
import chess
import chess.polyglot

# --- Evaluation Constants ---

# Material Values
PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}

# Piece-Square Tables (PST) - Encourages center control and development
PST = {
    chess.PAWN: [
        0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
        5,  5, 10, 25, 25, 10,  5,  5,
        0,  0,  0, 20, 20,  0,  0,  0,
        5, -5,-10,  0,  0,-10, -5,  5,
        5, 10, 10,-20,-20, 10, 10,  5,
        0,  0,  0,  0,  0,  0,  0,  0
    ],
    chess.KNIGHT: [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    ],
    chess.BISHOP: [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    ],
    chess.ROOK: [
        0,  0,  0,  0,  0,  0,  0,  0,
        5, 10, 10, 10, 10, 10, 10,  5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
        0,  0,  0,  5,  5,  0,  0,  0
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

class ChessBot:
    def __init__(self, book_path=None):
        self.board = chess.Board()
        self.start_time = 0
        self.time_limit = 0
        self.book = None
        if book_path:
            try:
                self.book = chess.polyglot.open_reader(book_path)
            except FileNotFoundError:
                pass

    def evaluate(self):
        if self.board.is_checkmate():
            return -30000 if self.board.turn == chess.WHITE else 30000
        if self.board.is_stalemate() or self.board.is_insufficient_material():
            return 0

        score = 0

        # Material and PST
        for pt in PIECE_VALUES:
            # White pieces
            for sq in self.board.pieces(pt, chess.WHITE):
                score += PIECE_VALUES[pt]
                score += PST[pt][chess.square_mirror(sq)]
            # Black pieces
            for sq in self.board.pieces(pt, chess.BLACK):
                score -= PIECE_VALUES[pt]
                score -= PST[pt][sq]

        # Mobility (Simple count of legal moves)
        mobility = self.board.legal_moves.count()
        score += mobility if self.board.turn == chess.WHITE else -mobility

        return score if self.board.turn == chess.WHITE else -score

    def quiescence(self, alpha, beta):
        stand_pat = self.evaluate()
        if stand_pat >= beta:
            return beta
        if alpha < stand_pat:
            alpha = stand_pat

        for move in self.board.legal_moves:
            if self.board.is_capture(move):
                self.board.push(move)
                score = -self.quiescence(-beta, -alpha)
                self.board.pop()

                if score >= beta:
                    return beta
                if score > alpha:
                    alpha = score
        return alpha

    def order_moves(self, moves):
        # MVV-LVA (Most Valuable Victim - Least Valuable Aggressor)
        def score_move(move):
            if self.board.is_capture(move):
                victim = self.board.piece_at(move.to_square)
                aggressor = self.board.piece_at(move.from_square)
                if victim and aggressor:
                    return 10 * PIECE_VALUES[victim.piece_type] - PIECE_VALUES[aggressor.piece_type]
            return 0
        return sorted(moves, key=score_move, reverse=True)

    def minimax(self, depth, alpha, beta):
        if time.time() - self.start_time > self.time_limit:
            return None # Time out

        if depth == 0:
            return self.quiescence(alpha, beta)

        moves = self.order_moves(list(self.board.legal_moves))
        if not moves:
            return self.evaluate()

        best_score = -float('inf')
        for move in moves:
            self.board.push(move)
            score = -self.minimax(depth - 1, -beta, -alpha)
            self.board.pop()

            if score is None: return None

            if score >= beta:
                return beta
            if score > best_score:
                best_score = score
            if score > alpha:
                alpha = score

        return best_score

    def get_best_move(self, time_ms):
        # Opening Book Check
        if self.book:
            entry = self.book.get(self.board)
            if entry:
                return entry.move

        self.start_time = time.time()
        self.time_limit = (time_ms / 1000.0) * 0.95 # Buffer for safety

        best_move = None
        # Iterative Deepening
        for depth in range(1, 10): # Max depth 10 for safety
            current_best_move = None
            max_score = -float('inf')

            alpha = -float('inf')
            beta = float('inf')

            moves = self.order_moves(list(self.board.legal_moves))
            for move in moves:
                self.board.push(move)
                score = -self.minimax(depth - 1, -beta, -alpha)
                self.board.pop()

                if score is None: # Time expired during sub-search
                    break

                if score > max_score:
                    max_score = score
                    current_best_move = move

                alpha = max(alpha, score)

            if current_best_move:
                best_move = current_best_move
            else:
                break # Stop if we couldn't complete the current depth

            if time.time() - self.start_time > self.time_limit:
                break

        return best_move if best_move else list(self.board.legal_moves)[0]

def main():
    # You can specify a .bin book path here if you have one locally
    bot = ChessBot(book_path="opening_book.bin")

    while True:
        line = sys.stdin.readline()
        if not line:
            break

        try:
            data = json.loads(line)
            fen = data.get("fen")
            moves = data.get("moves", [])
            time_ms = data.get("time_ms", 1000)

            # Reconstruct board state
            bot.board = chess.Board(fen)
            for move_str in moves:
                bot.board.push_uci(move_str)

            # Calculate move
            best_move = bot.get_best_move(time_ms)

            # Output move
            output = {"bestmove": best_move.uci()}
            print(json.dumps(output))
            sys.stdout.flush()

        except Exception:
            # Fallback in case of parsing/logic errors to prevent crash
            fallback_board = chess.Board()
            print(json.dumps({"bestmove": list(fallback_board.legal_moves)[0].uci()}))
            sys.stdout.flush()

if __name__ == "__main__":
    main()