use std::collections::HashMap;

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

type Cache = HashMap<usize, HashMap<u64, usize>>;

fn main() {
    first_explore();

    // let res = vec![
    //     0.11743796,  // line value
    //     -1.2541437,  // x1
    //     -1.3426046,  // overhangs
    //     0.06455171,  // holes
    //     1.0662355,   // readiness depth
    //     0.11092834,  // tetris ready
    //     0.013263656, // good patterns
    //     -0.27358586, // bad patterns
    //     -0.35926318, // very bad patterns
    //     -1.3546457,  // height
    // ];

    // println!("eval {}", eval_point(&res, &mut Cache::default(), 0));

    // let mut game = Game::new(2, BoardEval(res.clone()));

    // println!("{:?}", &game);

    // let mut i = 0;

    // while !game.board.finished {
    //     game.step();
    //     i += 1;
    //     println!("step {}: {:?}", i, &game);
    // }

    // println!("{:?}", &res);
}

#[allow(dead_code)]
fn first_explore() {
    let init_simplex = (0..(BoardEval::dim() + 1))
        .map(|i| BoardEval::rand(i as u64).0)
        .collect::<Vec<_>>();

    let mut nm = NelderMead::<Cache>::new(init_simplex, 1.0);

    let res = nm.optimize(eval_point, 1e-4, 500);

    let res_score = eval_point(&res, &mut Cache::default(), 0);

    let mut game = Game::new(2, 130, BoardEval(res.clone()));

    println!("{:?}", &game);

    let mut i = 0;

    while !game.board.finished {
        game.step();
        i += 1;
        println!("step {}: {:?}", i, &game);
    }

    println!("{:?}", &res);
    println!("{}", res_score);
}

fn hash_point(point: &Vec<f32>) -> u64 {
    // this is a little hacky.. it's easy to construct collisions
    // however, it shouldn't be a problem in our use case
    point.into_iter().map(|x| x.to_bits() as u64).sum()
}

fn eval_point(point: &Vec<f32>, cache: &mut Cache, iter: usize) -> f32 {
    let board_eval = BoardEval(point.clone());

    let iters = 20;
    let lines_cleared_max = 130;
    let mut score_sum = 0;
    let start = 1 + iter / 3;

    cache.remove(&(start - 1));

    for seed in start..(start + iters) {
        let hpoint = hash_point(point);

        let cached_score = cache
            .get(&seed)
            .map(|subcache| subcache.get(&hpoint))
            .flatten()
            .cloned();

        if let Some(cached_score) = cached_score {
            score_sum += cached_score;
            continue;
        }

        let mut game = Game::new(seed as u64, lines_cleared_max, board_eval.clone());

        while !game.board.finished {
            game.step();
        }

        // dbg!(game.board.score);

        cache
            .entry(seed)
            .or_default()
            .insert(hash_point(point), game.board.score);

        score_sum += game.board.score;
    }

    let res = -(score_sum as f32) / (iters as f32);

    res
}

#[allow(dead_code)]
fn run_one_game() {
    let mut game = Game::new(0, 130, BoardEval::rand(0));

    while !game.board.finished {
        game.step();
    }

    dbg!(&game);
}

#[allow(dead_code)]
fn show_n_steps(n: usize) {
    let mut game = Game::new(0, 130, BoardEval::rand(0));

    println!("{:?}", &game);

    for i in 0..n {
        game.step();
        println!("step {}: {:?}", i, &game);
    }
}
