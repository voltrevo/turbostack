use crate::board::Board;

pub struct BoardEval {}

impl BoardEval {
    pub fn new() -> Self {
        BoardEval {}
    }

    pub fn eval(&self, board: &Board) -> f32 {
        let max_height: usize = board
            .heights()
            .iter()
            .fold(0, |acc, h| std::cmp::max(acc, *h));

        -(max_height as f32)
    }
}
