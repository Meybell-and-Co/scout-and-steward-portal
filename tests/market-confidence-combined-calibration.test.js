import test from "node:test";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

test("calibrates combined coverage and outlier pressure", () => {
    const cases = [
        { coverage: 1.0, sold_used: 10, eligible_sold_count: 10, outlier_pressure: 0 },
        { coverage: 0.5, sold_used: 5, eligible_sold_count: 10, outlier_pressure: 0 },
        { coverage: 0.3, sold_used: 3, eligible_sold_count: 10, outlier_pressure: 0 },
        { coverage: 1.0, sold_used: 10, eligible_sold_count: 10, outlier_pressure: 0.92 },
        { coverage: 0.5, sold_used: 5, eligible_sold_count: 10, outlier_pressure: 0.92 },
        { coverage: 0.3, sold_used: 3, eligible_sold_count: 10, outlier_pressure: 0.92 },
    ];

    const results = cases.map((input) => {
        const result = calculateMarketConfidence({
            evidence_sufficient: true,
            tier_code: "exact",
            sold_used: input.sold_used,
            eligible_sold_count: input.eligible_sold_count,
            agreement_ratio: 1,
            price_agreement: "strong",
            observation_window_days: 90,
            window_expanded: false,
            outlier_pressure: input.outlier_pressure,
        });

        return {
            coverage: input.coverage,
            outlierPressure: input.outlier_pressure,
            rating: result.rating,
            label: result.label,
        };
    });

    console.table(results);
});
