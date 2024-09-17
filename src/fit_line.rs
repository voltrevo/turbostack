/**
 * Finds (a, b) such that y=a+bx is the best fit for the points
 * (here 'best' means the smallest sum of squares of errors)
 */
pub fn fit_line(points: &[(f32, f32)]) -> (f32, f32) {
    let n = points.len() as f32;

    let (sum_x, sum_y, sum_xx, sum_xy) = points.iter().fold(
        (0.0, 0.0, 0.0, 0.0),
        |(sum_x, sum_y, sum_xx, sum_xy), &(x, y)| {
            (sum_x + x, sum_y + y, sum_xx + x * x, sum_xy + x * y)
        },
    );

    let b = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
    let a = (sum_y - b * sum_x) / n;

    (a, b)
}
