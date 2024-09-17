use lazy_static::lazy_static;
use rand::{rngs::StdRng, Rng, SeedableRng};
use std::fmt::Debug;

use crate::{
    board::{Board, SurfacePattern},
    board_eval::BoardEval,
    piece_type_generator::PieceTypeGenerator,
};

lazy_static! {
    static ref PATTERN: SurfacePattern = {
        SurfacePattern::new(&[
            "1 1", //
            "1 1",
            "1 1",
            " T ",
        ])
    };
}

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

        let effective_lines_cleared = if self.board.finished {
            std::cmp::max(self.board.lines_cleared, self.board.lines_cleared_max)
        } else {
            self.board.lines_cleared
        };

        writeln!(
            f,
            "  eff  : {}",
            ((self.board.score as f32) / (effective_lines_cleared as f32)).round() as i64
        )?;

        writeln!(
            f,
            "  trt  : {:.1}%",
            (4.0 * self.board.tetrises as f32) / (self.board.lines_cleared as f32)
        )?;

        let readiness = self.board.tetris_readiness();

        writeln!(f, "  str  : {}", self.board.to_compact_string())?;
        writeln!(f, "  holes: {}", self.board.holes().len())?;
        writeln!(f, "  overh: {}", self.board.overhangs().len())?;
        writeln!(f, "  ready: {:?}", readiness)?;
        writeln!(f, "  pat  : {}", self.board.count_surface_pattern(&PATTERN))?;

        if let Some((_, well_j)) = readiness {
            let (wh, wd, ws) = self.board.well_height_depth_slope(well_j);
            writeln!(f, "  wh   : {}", wh)?;
            writeln!(f, "  wd   : {}", wd)?;
            writeln!(f, "  ws   : {}", ws)?;
        }

        writeln!(f, "]")?;

        Ok(())
    }
}
