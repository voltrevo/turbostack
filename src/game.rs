use rand::{rngs::ThreadRng, Rng};

use crate::{board::Board, board_eval::BoardEval, piece_type_generator::PieceTypeGenerator};

pub struct Game {
    pub board: Board,
    pub board_eval: BoardEval,
    pub piece_type_generator: PieceTypeGenerator,
    pub rng: ThreadRng,
}

impl Game {
    pub fn new() -> Self {
        Self {
            board: Board::new(),
            board_eval: BoardEval::new(),
            piece_type_generator: PieceTypeGenerator::new(),
            rng: rand::thread_rng(),
        }
    }

    pub fn step(&mut self) {
        if self.board.finished {
            return;
        }

        let piece_type = self.piece_type_generator.gen(self.rng.gen());

        let choices = self.board.find_choices(piece_type);

        let mut best_choice = None;
        let mut best_eval = 0.0;

        for choice in choices {
            let eval = self.board_eval.eval(&choice);

            if best_choice.is_none() || eval > best_eval {
                best_eval = eval;
                best_choice = Some(choice);
            }
        }

        let best_choice = match best_choice {
            Some(best_choice) => best_choice,
            None => {
                self.board.finished = true;
                return;
            }
        };

        self.board = best_choice;
    }
}
