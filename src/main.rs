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

    let res = vec![
        //     -1.3629023,    // line value
        //     1.0010495,     // x1
        //     2.5488162,     // overhangs
        //     0.7336444,     // holes
        //     -2.3325214,    // readiness depth
        //     1.1052921,     // tetris ready
        //     -0.0116937645, // good patterns
        //     0.26175177,    // bad patterns
        //     0.8194094,     // very bad patterns
        //     2.1194324,     // height
        0.11743796,  // line value
        -1.2541437,  // x1
        -1.3426046,  // overhangs
        0.06455171,  // holes
        1.0662355,   // readiness depth
        0.11092834,  // tetris ready
        0.013263656, // good patterns
        -0.27358586, // bad patterns
        -0.35926318, // very bad patterns
        -1.3546457,  // height
    ];

    println!("eval {}", eval_point(&res, &mut (), 0));

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

#[allow(dead_code)]
fn first_explore() {
    let init_simplex = (0..(BoardEval::dim() + 1))
        .map(|i| BoardEval::rand(i as u64).0)
        .collect::<Vec<_>>();

    let mut nm = NelderMead::<()>::new(init_simplex);

    let res = nm.optimize(eval_point, 1e-4, 50);

    let res_score = eval_point(&res, &mut (), 0);

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

fn eval_point(point: &Vec<f32>, _state: &mut (), _iter: usize) -> f32 {
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
