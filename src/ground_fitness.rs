use crate::{board_eval::BoardEval, game::Game};

pub fn ground_fitness(
    model: &Vec<f32>,
    depth: usize,
    max_lines: usize,
    first_seed: usize,
    samples: usize,
) -> f32 {
    let mut sum = 0;

    let board_eval = BoardEval(model.clone());

    for s in first_seed..(first_seed + samples) {
        let mut game = Game::new(s as u64, max_lines, board_eval.clone(), depth);

        while !game.board.finished {
            game.step();
        }

        sum += game.board.score;
    }

    (sum as f32) / (samples as f32)
}
