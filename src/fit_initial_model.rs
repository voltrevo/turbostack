use std::collections::HashMap;

use crate::{board_eval::BoardEval, ground_fitness::ground_fitness, nelder_mead::NelderMead};

type Cache = HashMap<usize, HashMap<u64, f32>>;

#[allow(dead_code)]
pub fn fit_initial_model(iters: usize) -> Vec<f32> {
    let init_simplex = (0..BoardEval::dim() + 1)
        .map(|i| BoardEval::rand(i as u64).0)
        .collect::<Vec<_>>();

    let mut nm = NelderMead::<Cache>::new(init_simplex, 1.0);

    let model = nm.maximize(fitness, 1e-4, iters);

    model
}

fn hash_model(point: &Vec<f32>) -> u64 {
    // this is a little hacky.. it's easy to construct collisions
    // however, it shouldn't be a problem in our use case
    point.into_iter().map(|x| x.to_bits() as u64).sum()
}

fn fitness(model: &Vec<f32>, cache: &mut Cache, iter: usize) -> f32 {
    let samples = 10;
    let lines_cleared_max = 130;
    let mut fitness_sum: f32 = 0.0;
    let first_seed = 1 + iter / 10;

    cache.remove(&(first_seed - 1));

    for seed in first_seed..(first_seed + samples) {
        let hpoint = hash_model(model);

        let cached_score = cache
            .get(&seed)
            .map(|subcache| subcache.get(&hpoint))
            .flatten()
            .cloned();

        if let Some(cached_score) = cached_score {
            fitness_sum += cached_score;
            continue;
        }

        let fitness = ground_fitness(model, 1, lines_cleared_max, seed, 1);

        cache
            .entry(seed)
            .or_default()
            .insert(hash_model(model), fitness);

        fitness_sum += fitness;
    }

    (fitness_sum as f32) / (samples as f32)
}
