import test from "node:test";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

test("calibrates confidence across usable evidence quantities", () => {
    const quantities = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15];

    const results = quantities.map((soldUsed) => {
        const result = calculateMarketConfidence({
            evidence_sufficient: soldUsed >= 1,
            tier_code: "exact",
            eligible_sold_count: soldUsed,
            sold_used: soldUsed,
            agreement_ratio: 1.00,
            price_agreement: "strong",
            observation_window_days: 90,
            window_expanded: false,
        });

        return {
            soldUsed,
            rating: result.rating,
            confidenceLabel: result.label,
        };
    });

    console.table(results);
});
