#[derive(Clone, Debug)]
pub struct NelderMead<State: Default> {
    simplex: Vec<Vec<f32>>,
    state: State,
    alpha: f32,
    gamma: f32,
    rho: f32,
    sigma: f32,
}

impl<State: Default> NelderMead<State> {
    pub fn new(simplex: Vec<Vec<f32>>) -> Self {
        Self {
            simplex,
            state: Default::default(),
            alpha: 1.0, // reflection coefficient
            gamma: 2.0, // expansion coefficient
            rho: 0.5,   // contraction coefficient
            sigma: 0.5, // shrinkage coefficient
        }
    }

    pub fn optimize<F>(&mut self, func: F, tol: f32, max_iters: usize) -> Vec<f32>
    where
        F: Fn(&Vec<f32>, &mut State, usize) -> f32,
    {
        let n = self.simplex[0].len();
        let mut iter = 0;

        loop {
            println!("here {} {}", self.simplex.len(), self.simplex[0].len());

            let mut scored_simplex = self
                .simplex
                .iter()
                .map(|p| (p, func(p, &mut self.state, iter)))
                .collect::<Vec<_>>();

            // Sort the simplex vertices based on their function values
            scored_simplex.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());

            self.simplex = scored_simplex.iter().map(|(p, _)| (*p).clone()).collect();

            println!("here2");

            let best = self.simplex[0].clone();
            let worst = self.simplex[n].clone();
            let second_worst = self.simplex[n - 1].clone();

            // Calculate the centroid of all points except the worst
            let centroid = self.compute_centroid(n);

            // Perform reflection
            let reflection = self.reflect(&centroid, &worst);
            let f_reflection = func(&reflection, &mut self.state, iter);

            if f_reflection < func(&best, &mut self.state, iter) {
                // Perform expansion
                let expansion = self.expand(&centroid, &worst);
                if func(&expansion, &mut self.state, iter) < f_reflection {
                    self.simplex[n] = expansion;
                } else {
                    self.simplex[n] = reflection;
                }
            } else if f_reflection < func(&second_worst, &mut self.state, iter) {
                self.simplex[n] = reflection;
            } else {
                // Perform contraction
                let contraction = self.contract(&centroid, &worst);
                if func(&contraction, &mut self.state, iter) < func(&worst, &mut self.state, iter) {
                    self.simplex[n] = contraction;
                } else {
                    // Shrink the simplex if contraction fails
                    self.shrink();
                }
            }

            // Check the size of the simplex (difference between best and worst)
            let size = self
                .simplex
                .iter()
                .map(|point| {
                    point
                        .iter()
                        .zip(best.iter())
                        .map(|(xi, bi)| (xi - bi).powi(2))
                        .sum::<f32>()
                        .sqrt()
                })
                .fold(0.0 / 0.0, f32::max); // max distance in the simplex

            if size < tol || iter >= max_iters {
                break;
            }

            iter += 1;
            dbg!(iter);
        }

        self.simplex[0].clone()
    }

    fn compute_centroid(&self, n: usize) -> Vec<f32> {
        let mut centroid = vec![0.0; n];
        for i in 0..n {
            for j in 0..self.simplex.len() - 1 {
                centroid[i] += self.simplex[j][i];
            }
            centroid[i] /= n as f32;
        }
        centroid
    }

    fn reflect(&self, centroid: &Vec<f32>, worst: &Vec<f32>) -> Vec<f32> {
        centroid
            .iter()
            .zip(worst.iter())
            .map(|(c, w)| c + self.alpha * (c - w))
            .collect()
    }

    fn expand(&self, centroid: &Vec<f32>, worst: &Vec<f32>) -> Vec<f32> {
        centroid
            .iter()
            .zip(worst.iter())
            .map(|(c, w)| c + self.gamma * (c - w))
            .collect()
    }

    fn contract(&self, centroid: &Vec<f32>, worst: &Vec<f32>) -> Vec<f32> {
        centroid
            .iter()
            .zip(worst.iter())
            .map(|(c, w)| c + self.rho * (w - c))
            .collect()
    }

    fn shrink(&mut self) {
        let best = self.simplex[0].clone();
        for point in &mut self.simplex[1..] {
            for i in 0..point.len() {
                point[i] = best[i] + self.sigma * (point[i] - best[i]);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rosenbrock_3d() {
        let initial_simplex = vec![
            vec![0.0, 0.0, 0.0], // Initial guess
            vec![1.2, 0.0, 0.0], // Perturbation for simplex initialization
            vec![0.0, 1.2, 0.0],
            vec![0.0, 0.0, 1.2],
        ];

        let mut nelder_mead = NelderMead::<()>::new(initial_simplex);

        let result = nelder_mead.optimize(
            |x, _, _| {
                let a = 1.0;
                let b = 100.0;
                (a - x[0]).powi(2)
                    + b * (x[1] - x[0].powi(2)).powi(2)
                    + (a - x[1]).powi(2)
                    + b * (x[2] - x[1].powi(2)).powi(2)
            },
            1e-6,  // Tolerance
            10000, // Max iterations
        );

        let expected = vec![1.0, 1.0, 1.0];
        for i in 0..3 {
            assert!(
                (result[i] - expected[i]).abs() < 1e-3,
                "Failed for Rosenbrock 3D test"
            );
        }
    }

    #[test]
    fn test_sphere_function() {
        // Sphere function: f(x) = x1^2 + x2^2 + x3^2 + ... xn^2
        // Minimum is at [0.0, 0.0, ... , 0.0]
        let initial_simplex = vec![
            vec![1.0, 1.0, 1.0],
            vec![1.5, 1.0, 1.0],
            vec![1.0, 1.5, 1.0],
            vec![1.0, 1.0, 1.5],
        ];

        let mut nelder_mead = NelderMead::<()>::new(initial_simplex);

        let result = nelder_mead.optimize(
            |x, _, _| x.iter().map(|&xi| xi.powi(2)).sum::<f32>(), // Sum of squares function
            1e-6,                                                  // Tolerance
            1000,                                                  // Max iterations
        );

        let expected = vec![0.0, 0.0, 0.0];
        for i in 0..3 {
            assert!(
                (result[i] - expected[i]).abs() < 1e-3,
                "Failed for Sphere function test"
            );
        }
    }

    #[test]
    fn test_booth_function() {
        // Booth function: f(x, y) = (x + 2y - 7)^2 + (2x + y - 5)^2
        // Minimum is at [1.0, 3.0]
        let initial_simplex = vec![vec![0.0, 0.0], vec![1.0, 0.0], vec![0.0, 1.0]];

        let mut nelder_mead = NelderMead::<()>::new(initial_simplex);

        let result = nelder_mead.optimize(
            |x, _, _| (x[0] + 2.0 * x[1] - 7.0).powi(2) + (2.0 * x[0] + x[1] - 5.0).powi(2),
            1e-6, // Tolerance
            1000, // Max iterations
        );

        let expected = vec![1.0, 3.0];
        for i in 0..2 {
            assert!(
                (result[i] - expected[i]).abs() < 1e-3,
                "Failed for Booth function test"
            );
        }
    }
}
