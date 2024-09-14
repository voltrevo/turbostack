use crate::piece::Piece;

pub struct Board {
    pub rows: [BoardRow; 20],
    pub cols: [BoardCol; 10],
}

impl Board {
    pub fn new() -> Self {
        Self {
            rows: [BoardRow::default(); 20],
            cols: [BoardCol::default(); 10],
        }
    }

    pub fn remove_clears(&mut self) {
        for i in (0..20).rev() {
            if self.rows[i].full() {
                self.remove_row(i);
            }
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
        if j < 0 || j >= 20 {
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

        for (i, j) in piece.board_squares() {
            res = res && !self.get_signed(i, j);
        }

        res
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
}
