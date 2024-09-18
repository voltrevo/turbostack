use lazy_static::lazy_static;
use rand::{rngs::StdRng, Rng, SeedableRng};
use std::fmt::Debug;

use crate::{
    board::{Board, SurfacePattern},
    board_eval::BoardEval,
    piece::PieceType,
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
    pub search_depth: usize,
}

impl Game {
    pub fn new(
        seed: u64,
        lines_cleared_max: usize,
        board_eval: BoardEval,
        search_depth: usize,
    ) -> Self {
        Self {
            board: Board::new(lines_cleared_max),
            last_board: Board::new(lines_cleared_max),
            board_eval,
            piece_type_generator: PieceTypeGenerator::new(),
            rng: StdRng::seed_from_u64(seed),
            search_depth,
        }
    }

    pub fn step(&mut self) {
        self.last_board = self.board.clone();

        if self.board.finished {
            return;
        }

        let piece_type = self.piece_type_generator.gen(self.rng.gen());

        let next_board = self.insert_piece_type(&self.board, piece_type, self.search_depth);

        let next_board = match next_board {
            Some(next_board) => next_board,
            None => {
                self.board.finished = true;
                return;
            }
        };

        self.board = next_board.0;
    }

    pub fn insert_piece_type(
        &self,
        board: &Board,
        piece_type: PieceType,
        depth: usize,
    ) -> Option<(Board, f32)> {
        assert!(depth > 0);
        let choices = board.find_choices(piece_type);

        let mut best_choice = None;
        let mut best_eval = 0.0;

        for choice in choices {
            let eval = self.eval(&choice, depth - 1);

            if best_choice.is_none() || eval > best_eval {
                best_eval = eval;
                best_choice = Some(choice);
            }
        }

        best_choice.map(|b| (b, best_eval))
    }

    pub fn eval(&self, board: &Board, depth: usize) -> f32 {
        if depth == 0 {
            return self.board_eval.eval(&board);
        }

        let mut sum = 0.0;

        for pt in PieceType::list() {
            let alt_board = self.insert_piece_type(&board, *pt, depth);

            match alt_board {
                Some((_, eval)) => {
                    sum += eval;
                }
                // TODO: it's unclear what the penalty should be if one of the placements fail
                None => {}
            }
        }

        sum / 7.0
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
