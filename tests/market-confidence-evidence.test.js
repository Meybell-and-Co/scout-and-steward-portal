import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

test("Case A/B: outlier pressure changes confidence independently", () => {
    const healthyEvidence = {
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
        outlier_pressure: 0,
    };

    const uglyEvidence = {
        ...healthyEvidence,
        outlier_pressure: 0.92,
    };

    const healthy = calculateMarketConfidence(healthyEvidence);
    const ugly = calculateMarketConfidence(uglyEvidence);

    console.table([
        {
            case: "A — no outlier pressure",
            baseline: healthyEvidence.baseline_cents,
            outlierPressure: healthyEvidence.outlier_pressure,
            confidence: healthy.label,
            rating: healthy.rating,
        },
        {
            case: "B — high outlier pressure",
            baseline: uglyEvidence.baseline_cents,
            outlierPressure: uglyEvidence.outlier_pressure,
            confidence: ugly.label,
            rating: ugly.rating,
        },
    ]);

    assert.equal(
        healthyEvidence.baseline_cents,
        uglyEvidence.baseline_cents
    );

    assert.equal(
        healthyEvidence.tier_code,
        uglyEvidence.tier_code
    );

    assert.equal(
        healthyEvidence.agreement_ratio,
        uglyEvidence.agreement_ratio
    );

    assert.ok(
        healthy.rating > ugly.rating
    );
});
