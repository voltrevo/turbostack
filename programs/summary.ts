import { PredictionModel } from "../src/PredictionModel";
import { ScoreModel } from "../src/ScoreModel";

// ScoreModel.create();
const model = PredictionModel.createEvalModel();
model.summary();
