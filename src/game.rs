use rand::{rngs::StdRng, Rng, SeedableRng};
use std::fmt::Debug;

use crate::{board::Board, board_eval::BoardEval, piece_type_generator::PieceTypeGenerator};

pub struct Game {
    pub board: Board,
    pub last_board: Board,
    pub board_eval: BoardEval,
    pub piece_type_generator: PieceTypeGenerator,
    pub rng: StdRng,
}

impl Game {
    pub fn new() -> Self {
        Self {
            board: Board::new(),
            last_board: Board::new(),
            board_eval: BoardEval::new(),
            piece_type_generator: PieceTypeGenerator::new(),
            rng: StdRng::seed_from_u64(0),
        }
    }

    pub fn step(&mut self) {
        self.last_board = self.board.clone();

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

impl Debug for Game {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Game [")?;

        writeln!(f, "   ....................")?;

        for i in 0..20 {
            write!(f, "  |")?;

            for j in 0..10 {
                if self.board.get(i, j) {
                    if !self.last_board.get(i, j) {
                        write!(f, "\x1b[34m[]\x1b[0m")?;
                    } else {
                        write!(f, "[]")?;
                    }
                } else {
                    write!(f, "  ")?;
                }
            }

            writeln!(f, "|")?;
        }

        writeln!(f, "  \\--------------------/")?;
        writeln!(f)?;

        writeln!(
            f,
            "  lines: {}/{}",
            self.board.lines_cleared, self.board.lines_cleared_max
        )?;

        writeln!(f, "  score: {}", self.board.score)?;

        writeln!(
            f,
            "  eff  : {}",
            ((self.board.score as f32) / (self.board.lines_cleared as f32)).round() as i64
        )?;

        writeln!(
            f,
            "  trt  : {:.1}%",
            (4.0 * self.board.tetrises as f32) / (self.board.lines_cleared as f32)
        )?;

        writeln!(f, "  str  : {}", self.board.to_compact_string(),)?;

        writeln!(f, "]")?;

        Ok(())
    }
}
