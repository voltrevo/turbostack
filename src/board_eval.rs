use crate::board::Board;

pub struct BoardEval {}

impl BoardEval {
    pub fn new() -> Self {
        BoardEval {}
    }

    pub fn eval(&self, board: &Board) -> f32 {
        // TODO: overhangs aren't all equal, need to evaluate hang depth
        let overhang_count = board.overhangs().len() as f32;

        let hole_count = board.holes().len() as f32;

        let max_height = board
            .heights()
            .iter()
            .fold(0, |acc, h| std::cmp::max(acc, *h)) as f32;

        -(hole_count * 10000.0 + overhang_count * 100.0 + max_height)
    }
}
