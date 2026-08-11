import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

const freshnessCases = [
    { ageDays: 30, label: "30 days" },
    { ageDays: 60, label: "60 days" },
    { ageDays: 90, label: "90 days" },
    { ageDays: 120, label: "120 days" },
    { ageDays: 180, label: "180 days" },
    { ageDays: 240, label: "240 days" },
    { ageDays: 365, label: "365 days" },
];

test("calibrates confidence across freshness markers", () => {
    const results = freshnessCases.map(({ ageDays, label }) => {
        const observationWindowDays =
            ageDays <= 90 ? 90 :
            ageDays <= 180 ? 180 :
            365;

        const result = calculateMarketConfidence({
            evidence_sufficient: true,
            tier_code: "exact",
            eligible_sold_count: 3,
            sold_used: 3,
            agreement_ratio: 1.00,
            price_agreement: "strong",
            observation_window_days: observationWindowDays,
            window_expanded: observationWindowDays > 90,
        });

        return {
            ageDays,
            label,
            rating: result.rating,
            confidenceLabel: result.label,
        };
    });

    console.table(results);

    assert.equal(results.length, 7);
});
