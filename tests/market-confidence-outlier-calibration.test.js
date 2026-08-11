import test from "node:test";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

test("calibrates confidence against outlier pressure", () => {
    const pressures = [
        0,
        0.1,
        0.2,
        0.3,
        0.4,
        0.5,
        0.6,
        0.7,
        0.8,
        0.9,
        1,
    ];

    const results = pressures.map((outlier_pressure) => {
        const result = calculateMarketConfidence({
            evidence_sufficient: true,
            tier_code: "exact",
            sold_used: 6,
            eligible_sold_count: 6,
            agreement_ratio: 1,
            price_agreement: "strong",
            observation_window_days: 90,
            window_expanded: false,
            outlier_pressure,
        });

        return {
            outlierPressure: outlier_pressure,
            rating: result.rating,
            label: result.label,
        };
    });

    console.table(results);
});
