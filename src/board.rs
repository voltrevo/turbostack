use std::{collections::BTreeSet, fmt::Debug};

use crate::piece::{Piece, PieceType, RotateDir};

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

    #[allow(dead_code)] // TODO
    pub fn from_compact(s: &str) -> Board {
        let mut board = Self::new();

        for (x, c) in s.chars().enumerate() {
            if c == '1' {
                board.flip(x / 10, x % 10);
            }
        }

        board
    }

    pub fn remove_clears(&mut self) {
        let mut lines_cleared = 0;

        for i in 0..20 {
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

    #[allow(dead_code)] // TODO
    pub fn set(&mut self, i: usize, j: usize, value: bool) {
        self.rows[i].set(j, value);
        self.cols[j].set(i, value);
    }

    pub fn flip(&mut self, i: usize, j: usize) {
        self.rows[i].flip(j);
        self.cols[j].flip(i);
    }

    pub fn piece_overlaps(&self, piece: &Piece) -> bool {
        for (i, j) in piece.cell_positions() {
            if self.get_signed(i, j) {
                return true;
            }
        }

        return false;
    }

    pub fn can_fit_piece(&self, piece: &Piece) -> bool {
        if self.piece_overlaps(piece) {
            return false;
        }

        // the simple test: is every cell above the height of the column
        if self.piece_reachable_simple(piece) {
            return true;
        }

        // less simple test: can we rotate or shift into a position that passes simple test
        // (this means we don't fully check possible paths - only one spin or tuck)

        // TODO: performance: PieceType::O can't be rotated and I, S, Z have only one alt rotation
        for dir in [RotateDir::Cw, RotateDir::Ccw] {
            let mut alt_piece = piece.clone();
            alt_piece.rotate(dir);

            if !self.piece_overlaps(&alt_piece) && self.piece_reachable_simple(&alt_piece) {
                return true;
            }
        }

        for j_shift in [-1_isize, 1_isize] {
            let mut alt_piece = piece.clone();
            alt_piece.pos.1 += j_shift;

            if !self.piece_overlaps(&alt_piece) && self.piece_reachable_simple(&alt_piece) {
                return true;
            }
        }

        return false;
    }

    pub fn piece_reachable_simple(&self, piece: &Piece) -> bool {
        for (i, j) in piece.cell_positions() {
            if i < 0 {
                continue;
            }

            if i > 20 {
                return false;
            }

            let cell_height = 20 - i as usize;
            let col_height = self.cols[j as usize].height();

            if cell_height <= col_height {
                return false;
            }
        }

        return true;
    }

    pub fn insert_piece_unchecked(&mut self, piece: &Piece) {
        for (i, j) in piece.cell_positions() {
            if i < 0 {
                continue;
            }

            self.flip(i as usize, j as usize);
        }
    }

    pub fn find_choices(&self, piece_type: PieceType) -> Vec<Board> {
        // TODO: performance: this can be HashSet
        // (using BTreeSet for reproducibility for debugging)
        let mut fittable_pieces = BTreeSet::<Piece>::new();

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

    pub fn heights(&self) -> [usize; 10] {
        self.cols.map(|c| c.height())
    }

    pub fn to_compact_string(&self) -> String {
        let mut res = String::new();

        for i in 0..20 {
            for j in 0..10 {
                res.push(if self.get(i, j) { '1' } else { '0' });
            }
        }

        res
    }

    // TODO: performance: calc overlaps with holes
    pub fn overhangs(&self) -> Vec<(isize, isize)> {
        let mut res = Vec::<_>::new();

        for j in 0..10 {
            for i in self.cols[j].overhangs() {
                res.push((i, j as isize));
            }
        }

        res
    }

    pub fn holes(&self) -> Vec<(isize, isize)> {
        let mut res = Vec::<_>::new();

        for j in 0..10 {
            for i in self.cols[j as usize].overhangs() {
                let left_closed = self.get_signed(i, j - 1);
                let right_closed = self.get_signed(i, j + 1);

                if left_closed && right_closed {
                    res.push((i, j));
                } else if left_closed && self.get_signed(i - 1, j + 1) {
                    // also consider this as a hole if the overhang is 2 deep
                    // (not exactly a hole but we assume you can't double tuck so you can't get a
                    // piece in there)
                    res.push((i, j));
                } else if right_closed && self.get_signed(i - 1, j - 1) {
                    // same as above but other side
                    res.push((i, j));
                }
            }
        }

        res
    }

    // (depth, j)
    // (4, j) means tetris ready (for any value of j)
    // (4, j) means the bottom 2 lines would clear if placing an I piece at j
    pub fn tetris_readiness(&self) -> Option<(usize, usize)> {
        let heights = self.cols.map(|c| c.height());

        let mut lowest_height = 21;
        let mut lowest_height_dups = 0;
        let mut lowest_j = 0;

        for (j, h) in heights.iter().cloned().enumerate() {
            if h <= lowest_height {
                if h == lowest_height {
                    lowest_height_dups += 1;
                } else {
                    lowest_height = h;
                    lowest_j = j;
                    lowest_height_dups = 0;
                }
            }
        }

        if lowest_height_dups > 0 {
            return None;
        }

        let j = lowest_j;

        let mut alt_board = self.clone();
        let mut clears = 0;

        for k in 0..4 {
            let i = 19 - lowest_height - k;
            debug_assert!(alt_board.get(i, j) == false);
            alt_board.flip(i, j);

            if alt_board.rows[i].full() {
                clears += 1;
            } else {
                break; // consecutive clears only
            }
        }

        let depth = clears;

        Some((depth, j))
    }

    pub fn count_surface_pattern(&self, pattern: &SurfacePattern) -> usize {
        let mut count = 0;

        'b: for pat_j in pattern.min_j..=pattern.max_j {
            let ref_top = self.cols[(pat_j + pattern.first_top.1) as usize].top();

            // align pattern so that first_top is a top
            // pat_i + pattern.first_top.1 == ref_top
            let pat_i = (ref_top as isize) - pattern.first_top.0;

            for (j, top) in pattern.tops.iter().enumerate() {
                let top = match top {
                    Some(top) => *top as usize,
                    None => continue,
                };

                if self.cols[(pat_j + (j as isize)) as usize].top() as isize
                    != pat_i + (top as isize)
                {
                    continue 'b;
                }
            }

            for (i, j, cell_value) in pattern.cells.iter().cloned() {
                if self.get_signed(pat_i + i, pat_j + j) != cell_value {
                    continue 'b;
                }
            }

            count += 1;
        }

        count
    }
}

pub struct SurfacePattern {
    first_top: (isize, isize),
    tops: Vec<Option<isize>>,
    cells: Vec<(isize, isize, bool)>,
    min_j: isize,
    max_j: isize, // inclusive
}

impl SurfacePattern {
    pub fn new(pattern: &[&'static str]) -> Self {
        // eg a symmetric 2-deep well:
        // "T T"
        // "1 1"
        // " T "

        // T: top-most block in the column (pattern must have at least one top)
        // 1: block present
        // 0: block absent
        //  : no requirement

        // asymmetric 2-deep well:
        // "1  "
        // "1 T"
        // "1 1"
        // " T "
        // this should be recognized against the left wall (wall counts as 1s)

        let pattern = pattern
            .iter()
            .map(|s| s.chars().collect::<Vec<char>>())
            .collect::<Vec<_>>();

        let pattern_height = pattern.len();
        assert!(pattern_height > 0);

        let pattern_width = pattern[0].len();
        assert!(pattern_width > 0);

        for i in 1..pattern_height {
            assert!(pattern[i].len() == pattern_width);
        }

        let mut first_top: Option<(isize, isize)> = None;
        let mut tops: Vec<Option<isize>> = vec![None; pattern_width];
        let mut cells = Vec::<(isize, isize, bool)>::new();

        for i in 0..pattern_height {
            for j in 0..pattern_width {
                match pattern[i][j] {
                    '0' => cells.push((i as isize, j as isize, false)),
                    '1' => cells.push((i as isize, j as isize, true)),
                    'T' => {
                        assert_eq!(tops[j], None, "duplicate top constraint");

                        if let Some((_, first_top_j)) = first_top {
                            assert_ne!(j as isize, first_top_j, "duplicate top constraint");
                            tops[j] = Some(i as isize);
                        } else {
                            first_top = Some((i as isize, j as isize));
                        }
                    }
                    _ => (),
                };
            }
        }

        let mut min_j = 0;

        'b: for j in 0..pattern_width {
            for i in 0..pattern_height {
                match pattern[i][j] {
                    '0' | 'T' => break 'b,
                    _ => {}
                }
            }

            min_j -= 1;
        }

        let mut max_j = 10 - (pattern_width as isize);

        'b: for j in (0..pattern_width).rev() {
            for i in 0..pattern_height {
                match pattern[i][j] {
                    '0' | 'T' => break 'b,
                    _ => {}
                }
            }

            max_j += 1;
        }

        Self {
            first_top: first_top.expect("pattern does not contain a top"),
            tops,
            cells,
            min_j,
            max_j,
        }
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
                    write!(f, "[]")?;
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

    // allows "-1" without a branch
    pub fn get_minus1(&self, i: usize) -> bool {
        (self.0 & (1 << (20 - i))) != 0
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
            if self.get(i as usize) == false && (i == 19 || self.get((i + 1) as usize)) == true {
                res.push((i, j));
            }
        }

        res
    }

    fn overhangs(&self) -> Vec<isize> {
        let height = self.height() as isize;

        let mut res = vec![];

        let y = 1 << height;
        let full_otherwise = y - 1;

        if self.0 == full_otherwise {
            return res;
        }

        for i in (21 - height)..20 {
            if self.get(i as usize) == false && self.get_minus1(i as usize) == true {
                res.push(i);
            }
        }

        res
    }

    // like height, but it's the j value in (i, j) of the top-most block
    fn top(&self) -> usize {
        // if height is zero then we consider the top-most block to be underneath the lowest actual
        // cell
        20 - self.height()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tetris_readiness() {
        let board = Board::from_compact(
            &[
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "0000000000",
                "1111111010",
                "1111111011",
                "1111111011",
                "0000001110",
            ] //        ^ depth: 2, column: 7
            .join(""),
        );

        assert_eq!(board.tetris_readiness(), Some((2, 7)));
    }
}
