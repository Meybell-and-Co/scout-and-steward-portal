import test from "node:test";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

import {
    MARKET_EVIDENCE_CASES
} from "./fixtures/market-evidence-cases.js";

test("calibrates confidence across A/B/C/D market shapes", () => {
    const results = Object.entries(MARKET_EVIDENCE_CASES).map(
        ([key, evidence]) => {
            const confidence = calculateMarketConfidence(evidence);

            return {
                case: key,
                description: evidence.name,
                baseline: evidence.baseline_cents,
                mad: evidence.mad_cents,
                sd: evidence.standard_deviation_cents,
                outlierPressure: evidence.outlier_pressure,
                rating: confidence.rating,
                confidenceLabel: confidence.label,
            };
        }
    );

    console.table(results);
});
