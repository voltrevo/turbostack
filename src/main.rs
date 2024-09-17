use board_eval::BoardEval;
use game::Game;
use nelder_mead::NelderMead;

mod board;
mod board_eval;
mod fit_line;
mod game;
mod nelder_mead;
mod piece;
mod piece_type_generator;

fn main() {
    let init_simplex = (0..(BoardEval::dim() + 1))
        .map(|i| BoardEval::rand(i as u64).0)
        .collect::<Vec<_>>();

    let mut nm = NelderMead::new(init_simplex);

    let res = nm.optimize(eval_point, 1e-4, 50);

    let res_score = eval_point(&res);

    println!("{:?}", &res);
    println!("{}", res_score);

    let mut game = Game::new(0, BoardEval(res.clone()));

    println!("{:?}", &game);

    let mut i = 0;

    while !game.board.finished {
        game.step();
        i += 1;
        println!("step {}: {:?}", i, &game);
    }

    println!("{:?}", &res);
}

fn eval_point(point: &Vec<f32>) -> f32 {
    let board_eval = BoardEval(point.clone());

    let iters = 20;
    let mut score_sum = 0.0;

    for i in 0..iters {
        let mut game = Game::new(i, board_eval.clone());

        while !game.board.finished {
            game.step();
        }

        score_sum += game.board.score as f32;
    }

    let res = -score_sum / (iters as f32);

    dbg!(res);

    res
}

#[allow(dead_code)]
fn run_one_game() {
    let mut game = Game::new(0, BoardEval::rand(0));

    while !game.board.finished {
        game.step();
    }

    dbg!(&game);
}

#[allow(dead_code)]
fn show_n_steps(n: usize) {
    let mut game = Game::new(0, BoardEval::rand(0));

    println!("{:?}", &game);

    for i in 0..n {
        game.step();
        println!("step {}: {:?}", i, &game);
    }
}
