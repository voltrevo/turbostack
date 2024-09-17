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
                "1 1",
                " T ",
            ],
            vec![ // well depth 2 on right side
                "1 T",
                "1 1",
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
}

lazy_static! {
    pub static ref FEATURE_LEN: usize = BoardEval::features(&Board::new()).len();
}

impl BoardEval {
    pub fn dim() -> usize {
        FEATURE_LEN.clone() + 1
    }

    pub fn rand(seed: u64) -> Self {
        let mut data = Vec::<f32>::new();

        let mut rng = StdRng::seed_from_u64(seed);
        let std_norm_dist = Normal::new(0.0, 1.0).unwrap();

        for _ in 0..(FEATURE_LEN.clone() + 1) {
            // TODO: why is clone needed above
            data.push(rng.sample(std_norm_dist))
        }

        Self(data)
    }

    pub fn line_value(&self) -> f32 {
        // A fixed multiplier of 100 seems to bring it into a 'sensible' range for optimization
        // algorithms. A good evaluator should value each line at 200+.
        self.0[0] * 100.0
    }

    pub fn feature_line_weights(&self) -> &[f32] {
        &self.0[1..]
    }

    pub fn eval(&self, board: &Board) -> f32 {
        let mut res = board.score as f32;

        let line_value = self.line_value();

        res += line_value * board.lines_remaining();

        let feat = Self::features(board);
        let feat_line_weights = self.feature_line_weights();

        assert_eq!(feat.len(), feat_line_weights.len());

        let mut feat_lines = 0.0;

        for i in 0..feat.len() {
            feat_lines += feat[i] * feat_line_weights[i];
        }

        res += feat_lines * line_value;

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

    pub fn features(board: &Board) -> Vec<f32> {
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
