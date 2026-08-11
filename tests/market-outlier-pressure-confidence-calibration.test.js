import test from "node:test";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

test("calibrates confidence response to outlier pressure", () => {
    const pressures = [
        0,
        0.10,
        0.20,
        0.30,
        0.40,
        0.50,
        0.60,
        0.70,
        0.80,
        0.90,
        1.00,
    ];

    const results = pressures.map((outlierPressure) => {
        const evidence = {
            baseline_cents: 1450,
            tier_code: "exact",
            sold_used: 6,
            eligible_sold_count: 6,
            observation_window_days: 90,
            agreement_ratio: 1,
            price_agreement: "strong",
            window_expanded: false,
            evidence_sufficient: true,
            freshness_strength: 0.91,
            mad_cents: 100,
            standard_deviation_cents: 141.42,
            outlier_pressure: outlierPressure,
        };

        const confidence = calculateMarketConfidence(evidence);

        return {
            outlierPressure,
            rating: confidence.rating,
            confidenceLabel: confidence.label,
        };
    });

    console.table(results);
});
