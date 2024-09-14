#[derive(Hash, PartialEq, Eq, Clone)]
pub struct Piece {
    pub type_: PieceType,
    pub grid: u16,
    pub pos: (isize, isize),
}

#[derive(Clone, Copy, Hash, PartialEq, Eq)]
pub enum PieceType {
    I,
    O,
    J,
    L,
    S,
    Z,
    T,
}

enum RotateDir {
    Cw,
    Ccw,
}

impl Piece {
    pub fn num_rotations(&self) -> usize {
        match self.type_ {
            PieceType::I => 2,
            PieceType::O => 1,
            PieceType::J => 4,
            PieceType::L => 4,
            PieceType::S => 2,
            PieceType::Z => 2,
            PieceType::T => 4,
        }
    }

    pub fn rotate(&mut self, dir: RotateDir) {
        let offset = match dir {
            RotateDir::Cw => 1,
            RotateDir::Ccw => 3,
        };

        let grids = self.type_.grids();
        let grid_i = find_grid_i(grids, self.grid);

        self.grid = grids[(grid_i + offset) % 4];
    }

    pub fn at(&self, i: usize, j: usize) -> bool {
        self.grid & (1 << (4 * i + j)) != 0
    }

    // TODO: performance: speed up with static data?
    pub fn cell_positions(&self) -> [(isize, isize); 4] {
        let mut res: [(isize, isize); 4] = [(0, 0); 4];
        let mut res_i = 0;

        for i in 0..16 {
            let mask = 1 << (15 - i);

            if self.grid & mask != 0 {
                res[res_i] = (self.pos.0 + i / 4, self.pos.1 + i % 4);

                if res_i == 3 {
                    return res;
                }

                res_i += 1;
            }
        }

        panic!("failed to find 4 cells in tetromino")
    }
}

impl PieceType {
    pub fn list() -> &'static [PieceType; 7] {
        &[
            PieceType::I,
            PieceType::O,
            PieceType::J,
            PieceType::L,
            PieceType::S,
            PieceType::Z,
            PieceType::T,
        ]
    }

    pub fn grids(&self) -> [u16; 4] {
        match self {
            PieceType::I => [
                0b_0000_0000_1111_0000,
                0b_0010_0010_0010_0010,
                0b_0000_0000_1111_0000,
                0b_0010_0010_0010_0010,
            ],
            PieceType::O => [
                0b_0000_0110_0110_0000,
                0b_0000_0110_0110_0000,
                0b_0000_0110_0110_0000,
                0b_0000_0110_0110_0000,
            ],
            PieceType::J => [
                0b_0000_1110_0010_0000,
                0b_0100_0100_1100_0000,
                0b_1000_1110_0000_0000,
                0b_0110_0100_0100_0000,
            ],
            PieceType::L => [
                0b_0000_1110_1000_0000,
                0b_1100_0100_0100_0000,
                0b_0010_1110_0000_0000,
                0b_0100_0100_0110_0000,
            ],
            PieceType::S => [
                0b_0000_0110_1100_0000,
                0b_0100_0110_0010_0000,
                0b_0000_0110_1100_0000,
                0b_0100_0110_0010_0000,
            ],
            PieceType::Z => [
                0b_0000_1100_0110_0000,
                0b_0010_0110_0100_0000,
                0b_0000_1100_0110_0000,
                0b_0010_0110_0100_0000,
            ],
            PieceType::T => [
                0b_0000_1110_0100_0000,
                0b_0100_1100_0100_0000,
                0b_0100_1110_0000_0000,
                0b_0100_0110_0100_0000,
            ],
        }
    }
}

pub fn find_grid_i(grids: [u16; 4], grid: u16) -> usize {
    for i in 0..4 {
        if grid == grids[i] {
            return i;
        }
    }

    panic!("Grid not found");
}
