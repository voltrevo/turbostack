use game::Game;

mod board;
mod board_eval;
mod game;
mod piece;
mod piece_type_generator;

fn main() {
    // run_one_game();
    show_n_steps(20);
}

#[allow(dead_code)]
fn run_one_game() {
    let mut game = Game::new();

    while !game.board.finished {
        game.step();
    }

    dbg!(&game);
}

#[allow(dead_code)]
fn show_n_steps(n: usize) {
    let mut game = Game::new();

    println!("{:?}", &game);

    for i in 0..n {
        game.step();
        println!("step {}: {:?}", i, &game);
    }
}
