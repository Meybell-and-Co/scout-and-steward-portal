import test from "node:test";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

test("calibrates outlier pressure across different confidence levels", () => {
    const cases = [
        {
            name: "Moderate",
            evidence: {
                tier_code: "category_era",
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
            },
        },
        {
            name: "High",
            evidence: {
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
            },
        },
        {
            name: "Very High",
            evidence: {
                tier_code: "same_issue",
                sold_used: 10,
                eligible_sold_count: 10,
                observation_window_days: 90,
                agreement_ratio: 1,
                price_agreement: "strong",
                window_expanded: false,
                evidence_sufficient: true,
                freshness_strength: 0.91,
                mad_cents: 100,
                standard_deviation_cents: 141.42,
            },
        },
    ];

    const pressures = [0, 0.2, 0.4, 0.6, 0.8, 1];

    const results = [];

    for (const scenario of cases) {
        for (const outlierPressure of pressures) {
            const confidence = calculateMarketConfidence({
                ...scenario.evidence,
                outlier_pressure: outlierPressure,
            });

            results.push({
                baseCase: scenario.name,
                outlierPressure,
                rating: confidence.rating,
                confidenceLabel: confidence.label,
            });
        }
    }

    console.table(results);
});
