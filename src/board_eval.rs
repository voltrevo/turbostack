use crate::board::{Board, SurfacePattern};
use lazy_static::lazy_static;
use rand::{rngs::StdRng, Rng, SeedableRng};
use rand_distr::Normal;

#[derive(Clone)]
pub struct BoardEval(pub Vec<f32>);

lazy_static! {
    static ref PATTERNS: Vec<SurfacePattern> = {
        [
            vec![ // flat
                "TT",
            ],
            vec![ // double flat
                "TTT",
            ],
            vec![ // flat up
                "  T",
                "TT ",
            ],
            vec![ // flat down
                "TT ",
                "  T",
            ],
            vec![ // up flat
                " TT",
                "T  ",
            ],
            vec![ // down flat
                "T  ",
                " TT",
            ],
            vec![ // pot hole
                "T T",
                " T ",
            ],
            vec![ // bump
                " T ",
                "T T",
            ],
            vec![ // step up
                " T",
                "T ",
            ],
            vec![ // step down
                "T ",
                " T",
            ],
            vec![ // two step ups
                "  T",
                " T ",
                "T  ",
            ],
            vec![ // two step downs
                "T  ",
                " T ",
                "  T",
            ],
            vec![ // double step up
                " T",
                " 1",
                "T ",
            ],
            vec![ // double step down
                "T ",
                "1 ",
                " T",
            ],
            vec![ // step up >= 3
                " 1",
                " 1",
                " 1",
                "T ",
            ],
            vec![ // step down >= 3
                "1 ",
                "1 ",
                "1 ",
                " T",
            ],
            vec![ // well depth >= 3
                "1 1",
                "1 1",
                "1 1",
                " T ",
            ],
            vec![ // well depth 2
                "T T",
                "1 1",
                " T ",
            ],
            vec![ // well depth 2 on left side
                "T 1",
                "1 1",
                " T ",
            ],
            vec![ // well depth 2 on right side
                "1 T",
                "1 1",
                " T ",
            ],
            vec![ // hook left
                "  1",
                "T 1",
                " T ",
            ],
            vec![ // hook right
                "1  ",
                "1 T",
                " T ",
            ],
            vec![ // shallow w
                "1   1",
                "1 T 1",
                " T T ",
            ],
            vec![ // deep w
                "1   1",
                "1 T 1",
                "1 1 1",
                " T T ",
            ],
            vec![ // square well
                "1  1",
                "1  1",
                " TT ",
            ],
            vec![ //
                "1  1",
                " T 1",
                "  T ",
            ],
            vec![ //
                "1  1",
                "1 T ",
                " T  ",
            ],
            vec![ //
                "1   1",
                " T T ",
                "  T  ",
            ],
        ].iter().map(|p| SurfacePattern::new(p)).collect()
    };

    static ref GOOD_PATTERNS: Vec<SurfacePattern> = {
        [
            vec![ // flat
                "TT",
            ],
            vec![ // double flat
                "TTT",
            ],
            vec![ // flat up
                "  T",
                "TT ",
            ],
            vec![ // down flat
                "T  ",
                " TT",
            ],
        ].iter().map(|p| SurfacePattern::new(p)).collect()
    };

    static ref BAD_PATTERNS: Vec<SurfacePattern> = {
        [
            vec![ // double step up
                " T",
                " 1",
                "T ",
            ],
            vec![ // double step down
                "T ",
                "1 ",
                " T",
            ],
            vec![ // step up >= 3
                " 1",
                " 1",
                " 1",
                "T ",
            ],
            vec![ // step down >= 3
                "1 ",
                "1 ",
                "1 ",
                " T",
            ],
            vec![ // well depth 2
                "T T",
                "1 1",
                " T ",
            ],
            vec![ // well depth 2 on left side
                "T 1",
                "1 1",
                " T ",
            ],
            vec![ // well depth 2 on right side
                "1 T",
                "1 1",
                " T ",
            ],
            vec![ // hook left
                "  1",
                "T 1",
                " T ",
            ],
            vec![ // hook right
                "1  ",
                "1 T",
                " T ",
            ],
        ].iter().map(|p| SurfacePattern::new(p)).collect()
    };

    static ref VERY_BAD_PATTERNS: Vec<SurfacePattern> = {
        [
            vec![ // well depth >= 3
                "1 1",
                "1 1",
                "1 1",
                " T ",
            ],
            vec![ // shallow w
                "1   1",
                "1 T 1",
                " T T ",
            ],
            vec![ // deep w
                "1   1",
                "1 T 1",
                "1 1 1",
                " T T ",
            ],
        ].iter().map(|p| SurfacePattern::new(p)).collect()
    };

    pub static ref FEATURE_LEN: usize = BoardEval::features_sm(&Board::new(130)).len();
}

impl BoardEval {
    pub fn dim() -> usize {
        FEATURE_LEN.clone()
    }

    pub fn eval(&self, board: &Board) -> f32 {
        self.eval_sm(board)
    }

    pub fn rand(seed: u64) -> Self {
        let mut data = Vec::<f32>::new();

        let mut rng = StdRng::seed_from_u64(seed);
        let std_norm_dist = Normal::new(0.0, 1.0).unwrap();

        for _ in 0..FEATURE_LEN.clone() {
            // TODO: why is clone needed above
            data.push(rng.sample(std_norm_dist))
        }

        Self(data)
    }

    #[allow(dead_code)]
    pub fn eval_sm(&self, board: &Board) -> f32 {
        let mut res = 0.0;

        let feat = Self::features_sm(board);

        assert_eq!(feat.len(), self.0.len());

        for i in 0..feat.len() {
            res += feat[i] * self.0[i];
        }

        res
    }

    #[allow(dead_code)]
    pub fn naive_eval(&self, board: &Board) -> f32 {
        // TODO: overhangs aren't all equal, need to evaluate hang depth
        let overhang_count = board.overhangs().len() as f32;

        let hole_count = board.holes().len() as f32;

        let max_height = board
            .heights()
            .iter()
            .fold(0, |acc, h| std::cmp::max(acc, *h)) as f32;

        -(hole_count * 10000.0 + overhang_count * 100.0 + max_height)
    }

    pub fn features_sm(board: &Board) -> Vec<f32> {
        let mut res = Vec::<f32>::new();

        res.push(board.score as f32);
        res.push(board.lines_remaining());

        res.push(board.overhangs().len() as f32);
        res.push(board.holes().len() as f32);

        let readiness = board.tetris_readiness();

        let readiness_depth = readiness.map(|(depth, _j)| depth).unwrap_or(0);
        let readiness_j = readiness.map(|(_depth, j)| j);

        res.push(readiness_depth as f32);
        res.push((readiness_depth >= 4) as usize as f32);

        let mut pat_board = board.clone();

        if let Some(j) = readiness_j {
            pat_board.set(0, j, true);
        }

        res.push(
            GOOD_PATTERNS
                .clone()
                .iter()
                .map(|p| pat_board.count_surface_pattern(p))
                .sum::<usize>() as f32,
        );

        res.push(
            BAD_PATTERNS
                .clone()
                .iter()
                .map(|p| pat_board.count_surface_pattern(p))
                .sum::<usize>() as f32,
        );

        res.push(
            VERY_BAD_PATTERNS
                .clone()
                .iter()
                .map(|p| pat_board.count_surface_pattern(p))
                .sum::<usize>() as f32,
        );

        let (height, stdev_height) = {
            // excluding well
            let mut heights = Vec::<f32>::new();

            for j in 0..10 {
                if readiness_j != Some(j) {
                    heights.push(board.cols[j].height() as f32);
                }
            }

            let avg = heights.iter().sum::<f32>() / (heights.len() as f32);
            let var = heights
                .iter()
                .map(|h| {
                    let dh = h - avg;
                    dh * dh
                })
                .sum::<f32>()
                / (heights.len() as f32);

            (avg, f32::sqrt(var))
        };

        res.push(height);
        res.push(stdev_height);

        res
    }

    #[allow(dead_code)]
    pub fn features_lg(board: &Board) -> Vec<f32> {
        let mut res = Vec::<f32>::new();

        res.push(1.0); // avoids needing explicit constant term elsewhere

        // res.push(board.score as f32); // hardcoded unscaled inclusion

        // lines is a special multiplier
        // (features dot feature_weights) is also to be multiplied by whatever a line is worth
        // this way each feature can be understood to be worth a certain (possibly negative) number
        // of lines
        // res.push(board.lines_remaining());

        res.push(board.overhangs().len() as f32);
        res.push(board.holes().len() as f32);

        let readiness = board.tetris_readiness();

        let readiness_depth = readiness.map(|(depth, _j)| depth).unwrap_or(0);
        let readiness_j = readiness.map(|(_depth, j)| j);

        // binary feature for each readiness depth 0..10
        for i in 0..10 {
            res.push((i == readiness_depth) as usize as f32);
        }

        // readiness depth >= 10
        res.push((readiness_depth >= 10) as usize as f32);

        // binary feature for each well location (possibly all zeros)
        for j in 0..10 {
            res.push((Some(j) == readiness_j) as usize as f32);
        }

        // each well location: 0 or readiness depth
        // allows some learning about combination of location and depth without needing to include
        // the full matrix
        for j in 0..10 {
            res.push(if Some(j) == readiness_j {
                readiness_depth
            } else {
                0
            } as f32);
        }

        let lowest_j_s = {
            if let Some(readiness_j) = readiness_j {
                vec![readiness_j]
            } else {
                let mut lowest_j_s = Vec::<usize>::new();
                let mut lowest_height = usize::MAX;

                for j in 0..10 {
                    let height = board.cols[j].height();

                    if height < lowest_height {
                        lowest_j_s.clear();
                        lowest_j_s.push(j);
                        lowest_height = height;
                    } else if height == lowest_height {
                        lowest_j_s.push(j);
                    }
                }

                lowest_j_s
            }
        };

        let (mut wh, mut wd, mut ws) = (0.0, 0.0, 0.0);

        for j in lowest_j_s.iter().cloned() {
            let curr = board.well_height_depth_slope(j);
            wh += curr.0;
            wd += curr.1;
            ws += curr.2;
        }

        res.push(wh / (lowest_j_s.len() as f32));
        res.push(wd / (lowest_j_s.len() as f32));
        res.push(ws / (lowest_j_s.len() as f32));

        let mut pat_board = board.clone();

        if let Some(readiness_j) = readiness_j {
            // For the purposes of pattern recognition, don't treat the primary well (for scoring
            // tetrises) as a regular well. This is a bit of a hack by placing a block at the top of
            // that column.
            pat_board.set(0, readiness_j, true);
        }

        for pat in PATTERNS.clone() {
            // TODO: why is clone needed?
            res.push(pat_board.count_surface_pattern(&pat) as f32);
        }

        res
    }
}
