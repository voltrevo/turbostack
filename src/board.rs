use std::{collections::HashSet, fmt::Debug};

use crate::piece::{Piece, PieceType};

#[derive(Clone)]
pub struct Board {
    pub rows: [BoardRow; 20],
    pub cols: [BoardCol; 10],
    pub lines_cleared: usize,
    pub lines_cleared_max: usize,
    pub finished: bool,
    pub score: usize,
    pub tetrises: usize,
}

impl Board {
    pub fn new() -> Self {
        Self {
            rows: [BoardRow::default(); 20],
            cols: [BoardCol::default(); 10],
            lines_cleared: 0,
            lines_cleared_max: 130,
            finished: false,
            score: 0,
            tetrises: 0,
        }
    }

    pub fn remove_clears(&mut self) {
        let mut lines_cleared = 0;

        for i in (0..20).rev() {
            if self.rows[i].full() {
                self.remove_row(i);
                lines_cleared += 1;
            }
        }

        self.score += match lines_cleared {
            0 => 0,
            1 => 40,
            2 => 100,
            3 => 300,
            4 => {
                self.tetrises += 1;
                1200
            }
            _ => panic!("Cleared more than 4 lines"),
        };

        self.lines_cleared += lines_cleared;

        if self.lines_cleared >= self.lines_cleared_max {
            self.finished = true;
        }
    }

    pub fn remove_row(&mut self, i: usize) {
        for j in (1..=i).rev() {
            self.rows[j] = self.rows[j - 1];
        }

        self.rows[0] = BoardRow::default();

        for col in &mut self.cols {
            col.remove_row(i)
        }
    }

    pub fn get(&self, i: usize, j: usize) -> bool {
        self.rows[i].get(j)
    }

    pub fn get_signed(&self, i: isize, j: isize) -> bool {
        if j < 0 || j >= 10 {
            return true;
        }

        if i >= 20 {
            return true;
        }

        if i < 0 {
            return false;
        }

        self.get(i as usize, j as usize)
    }

    pub fn set(&mut self, i: usize, j: usize, value: bool) {
        self.rows[i].set(j, value);
        self.cols[j].set(i, value);
    }

    pub fn flip(&mut self, i: usize, j: usize) {
        self.rows[i].flip(j);
        self.cols[j].flip(i);
    }

    pub fn can_fit_piece(&self, piece: &Piece) -> bool {
        let mut res = true;

        for (i, j) in piece.cell_positions() {
            res = res && !self.get_signed(i, j);
        }

        res
    }

    pub fn insert_piece_unchecked(&mut self, piece: &Piece) {
        for (i, j) in piece.cell_positions() {
            self.flip(i as usize, j as usize);
        }
    }

    pub fn find_choices(&self, piece_type: PieceType) -> Vec<Board> {
        let mut fittable_pieces = HashSet::<Piece>::new();

        let rest_positions = self.find_rest_positions();

        for grid in piece_type.grids() {
            let piece = Piece {
                type_: piece_type,
                grid,
                pos: (0, 0),
            };

            for cell_pos in piece.cell_positions() {
                for rest_pos in rest_positions.iter().cloned() {
                    let mut new_piece = piece.clone();
                    // translate the piece so that the current cell is at the rest position
                    new_piece.pos = (rest_pos.0 - cell_pos.0, rest_pos.1 - cell_pos.1);

                    // TODO: performance: can skip check for rest_pos
                    if self.can_fit_piece(&new_piece) {
                        fittable_pieces.insert(new_piece);
                    }
                }
            }
        }

        let mut res = Vec::<Board>::new();

        for piece in &fittable_pieces {
            let mut board = self.clone();
            board.insert_piece_unchecked(piece);
            board.remove_clears(); // TODO: performance: only check affected rows
            res.push(board);
        }

        res
    }

    pub fn find_rest_positions(&self) -> Vec<(isize, isize)> {
        let mut res = Vec::<_>::new();

        for j in 0..10 {
            res.append(&mut self.cols[j].find_rest_positions(j as isize));
        }

        res
    }
}

impl Debug for Board {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "Board [")?;

        writeln!(f, "   ....................")?;

        for i in 0..20 {
            write!(f, "  |")?;

            for j in 0..10 {
                if self.get(i, j) {
                    write!(f, "██")?;
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
            self.lines_cleared, self.lines_cleared_max
        )?;

        writeln!(f, "  score: {}", self.score)?;

        writeln!(
            f,
            "  eff  : {}",
            ((self.score as f32) / (self.lines_cleared as f32)).round() as i64
        )?;

        writeln!(
            f,
            "  trt  : {:.1}%",
            (4.0 * self.tetrises as f32) / (self.lines_cleared as f32)
        )?;

        writeln!(f, "]")
    }
}

#[derive(Default, Copy, Clone)]
pub struct BoardRow(u16);

impl BoardRow {
    pub fn full(&self) -> bool {
        self.0 == 0b11111_11111
    }

    pub fn get(&self, j: usize) -> bool {
        (self.0 & (1 << (9 - j))) != 0
    }

    pub fn set(&mut self, j: usize, value: bool) {
        let bit_mask = 1 << (9 - j);

        if value {
            self.0 |= bit_mask;
        } else {
            self.0 &= !bit_mask;
        }
    }

    pub fn flip(&mut self, j: usize) {
        self.0 ^= 1 << (9 - j);
    }
}

#[derive(Default, Copy, Clone)]
pub struct BoardCol(u32);

impl BoardCol {
    pub fn remove_row(&mut self, i: usize) {
        let keep_mask = (1 << (19 - i)) - 1;
        let shift = self.0 >> 1;
        self.0 = !keep_mask & shift | keep_mask & self.0;
    }

    pub fn height(&self) -> usize {
        (32 - self.0.leading_zeros()) as usize
    }

    pub fn get(&self, i: usize) -> bool {
        (self.0 & (1 << (19 - i))) != 0
    }

    pub fn set(&mut self, i: usize, value: bool) {
        let mask = 1 << (19 - i);

        if value {
            self.0 |= mask;
        } else {
            self.0 &= !mask;
        }
    }

    pub fn flip(&mut self, i: usize) {
        self.0 ^= 1 << (19 - i);
    }

    pub fn find_rest_positions(&self, j: isize) -> Vec<(isize, isize)> {
        let height = self.height() as isize;

        let mut res = if height == 20 {
            vec![]
        } else {
            vec![(19 - height, j)]
        };

        let y = 1 << height;
        let full_otherwise = y - 1;

        if self.0 == full_otherwise {
            return res;
        }

        for i in (21 - height)..20 {
            if self.get(i as usize) == false {
                res.push((i, j));
            }
        }

        res
    }
}
