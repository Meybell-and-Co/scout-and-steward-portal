import test from "node:test";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

test("calibrates confidence against evidence coverage", () => {
    const coverageCases = [
        [2, 2],
        [3, 10],
        [4, 10],
        [5, 10],
        [6, 10],
        [7, 10],
        [8, 10],
        [9, 10],
        [10, 10],
    ];

    const results = coverageCases.map(([sold_used, eligible_sold_count]) => {
        const result = calculateMarketConfidence({
            evidence_sufficient: true,
            tier_code: "exact",
            sold_used,
            eligible_sold_count,
            agreement_ratio: 1,
            price_agreement: "strong",
            observation_window_days: 90,
            window_expanded: false,
        });

        return {
            soldUsed: sold_used,
            eligibleSold: eligible_sold_count,
            coverage: sold_used / eligible_sold_count,
            rating: result.rating,
            label: result.label,
        };
    });

    console.table(results);
});
