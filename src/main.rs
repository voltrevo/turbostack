use board_eval::BoardEval;
use fit_initial_model::fit_initial_model;
use game::Game;

use crate::ground_fitness::ground_fitness;

mod board;
mod board_eval;
mod fit_initial_model;
mod fit_line;
mod game;
mod ground_fitness;
mod nelder_mead;
mod piece;
mod piece_type_generator;

fn main() {
    let model = fit_initial_model(300);
    show_n_steps(model.clone(), 15);
    run_one_game(model.clone());
    println!("{:?}", model);
    println!("fitness: {}", ground_fitness(&model, 130, 10_000, 1000));
}

#[allow(dead_code)]
fn run_one_game(model: Vec<f32>) {
    let mut game = Game::new(0, 130, BoardEval(model), 1);

    while !game.board.finished {
        game.step();
    }

    dbg!(&game);
}

#[allow(dead_code)]
fn show_n_steps(model: Vec<f32>, n: usize) {
    let mut game = Game::new(0, 130, BoardEval(model), 1);

    println!("{:?}", &game);

    for i in 0..n {
        game.step();
        println!("step {}: {:?}", i, &game);
    }
}
