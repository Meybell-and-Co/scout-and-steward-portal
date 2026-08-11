import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

test("confidence is reduced by coverage and outlier pressure without double-penalizing", () => {
    const cases = [
        {
            name: "complete clean evidence",
            sold_used: 10,
            eligible_sold_count: 10,
            outlier_pressure: 0,
            expected: 4,
            label: "High",
        },
        {
            name: "partial clean evidence",
            sold_used: 5,
            eligible_sold_count: 10,
            outlier_pressure: 0,
            expected: 3,
            label: "Moderate",
        },
        {
            name: "sparse clean evidence",
            sold_used: 3,
            eligible_sold_count: 10,
            outlier_pressure: 0,
            expected: 3,
            label: "Moderate",
        },
        {
            name: "complete ugly evidence",
            sold_used: 10,
            eligible_sold_count: 10,
            outlier_pressure: 0.92,
            expected: 3,
            label: "Moderate",
        },
        {
            name: "partial ugly evidence",
            sold_used: 5,
            eligible_sold_count: 10,
            outlier_pressure: 0.92,
            expected: 2,
            label: "Guarded",
        },
        {
            name: "sparse ugly evidence",
            sold_used: 3,
            eligible_sold_count: 10,
            outlier_pressure: 0.92,
            expected: 2,
            label: "Guarded",
        },
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
            case: input.name,
            coverage: input.sold_used / input.eligible_sold_count,
            outlierPressure: input.outlier_pressure,
            rating: result.rating,
            confidenceLabel: result.label,
            expected: input.label,
        };
    });

    console.table(results);

    for (const result of results) {
        assert.equal(result.rating, cases.find(
            (item) => item.name === result.case
        ).expected);
    }
});
