use game::Game;

mod board;
mod board_eval;
mod game;
mod piece;
mod piece_type_generator;

fn main() {
    let mut game = Game::new();

    for _ in 0..10 {
        game.step();
    }

    println!("{:?}", &game.board);
}
