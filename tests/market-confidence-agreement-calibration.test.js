import test from "node:test";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

test("calibrates confidence across price agreement levels", () => {
    const agreementLevels = [
        1.00,
        0.95,
        0.90,
        0.85,
        0.80,
        0.75,
        0.70,
    ];

    const results = agreementLevels.map((agreementRatio) => {
        const result = calculateMarketConfidence({
            evidence_sufficient: true,
            tier_code: "exact",
            eligible_sold_count: 3,
            sold_used: 3,
            agreement_ratio: agreementRatio,
            price_agreement:
                agreementRatio >= 0.75 ? "strong" : "weak",
            observation_window_days: 90,
            window_expanded: false,
        });

        return {
            agreement: agreementRatio,
            rating: result.rating,
            confidenceLabel: result.label,
        };
    });

    console.table(results);
});
