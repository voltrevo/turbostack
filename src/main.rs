use board_eval::BoardEval;
use game::Game;
use nelder_mead::NelderMead;
use rand::{thread_rng, Rng};

mod board;
mod board_eval;
mod fit_line;
mod game;
mod nelder_mead;
mod piece;
mod piece_type_generator;

fn main() {
    // first_explore();

    // let res = vec![
    //     -3.8387742,  // line value
    //     -0.6106285,  // x1
    //     3.6185656,   // overhangs
    //     0.27830136,  // holes
    //     -2.0106773,  // readiness depth
    //     -0.14960343, // tetris ready
    //     -0.56063694, // good patterns
    //     0.78189015,  // bad patterns
    //     0.047684643, // very bad patterns
    //     2.4581518,   // height
    // ];

    let res = vec![
        -1.7207618,   // line value
        -0.37228197,  // x1
        2.6049056,    // overhangs
        -0.087475166, // holes
        -0.7967446,   // readiness depth
        0.5389716,    // tetris ready
        -0.097938806, // good patterns
        0.8472595,    // bad patterns
        -0.34060836,  // very bad patterns
        0.8371644,    // height
    ];

    println!("eval {}", eval_point(&res));
}

#[allow(dead_code)]
fn first_explore() {
    let init_simplex = (0..(BoardEval::dim() + 1))
        .map(|i| BoardEval::rand(i as u64).0)
        .collect::<Vec<_>>();

    let mut nm = NelderMead::new(init_simplex);

    let res = nm.optimize(eval_point, 1e-4, 50);

    let res_score = eval_point(&res);

    println!("{:?}", &res);
    println!("{}", res_score);

    let mut game = Game::new(2, BoardEval(res.clone()));

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

    for _ in 0..iters {
        let mut rng = thread_rng();
        let mut game = Game::new(rng.gen(), board_eval.clone());

        while !game.board.finished {
            game.step();
        }

        // dbg!(game.board.score);

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
