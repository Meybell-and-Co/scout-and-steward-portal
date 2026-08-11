import test from "node:test";
import assert from "node:assert/strict";

import {
    assessMarketEvidence
} from "../src/services/market/evidence.js";

test("assembles a market evidence assessment", () => {
    const baseline = {
        confidence: "sufficient",
        tier_code: "exact",
        sold_observed: 8,
        eligible_sold_count: 6,
        sold_used: 6,
        active_observed: 4,
        observation_window_days: 90,
        representative_count: 5,
        unusual_count: 1,
        agreement_ratio: 5 / 6,
        price_agreement: "strong",
        window_expanded: false,
        evidence_sufficient: true,
        recommended_price_cents: 1450,
    };

    const freshness = 0.91;

    const dispersion = {
        median: 1450,
        mad: 150,
        standard_deviation: 197.2,
    };

    const outlierPressure = 0.12;

    const result = assessMarketEvidence({
        baseline,
        freshness,
        dispersion,
        outlierPressure,
    });

    assert.deepEqual(result, {
        baseline_cents: 1450,
        tier_code: "exact",
        sold_used: 6,
        eligible_sold_count: 6,
        active_observed: 4,
        observation_window_days: 90,
        representative_count: 5,
        unusual_count: 1,
        agreement_ratio: 5 / 6,
        price_agreement: "strong",
        window_expanded: false,
        evidence_sufficient: true,
        freshness_strength: 0.91,
        median_cents: 1450,
        mad_cents: 150,
        standard_deviation_cents: 197.2,
        outlier_pressure: 0.12,
        tail_shape: "normal",
    });
});
