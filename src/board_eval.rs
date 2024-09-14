use crate::board::Board;

pub struct BoardEval {}

impl BoardEval {
    pub fn new() -> Self {
        BoardEval {}
    }

    pub fn eval(&self, _board: &Board) -> f32 {
        0.0 // TODO
    }
}
