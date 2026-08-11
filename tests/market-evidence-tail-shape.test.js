import test from "node:test";
import assert from "node:assert/strict";

import {
    assessMarketEvidence
} from "../src/services/market/evidence.js";

test("assembles tail shape from market dispersion", () => {
    const baseline = {
        tier_code: "exact",
        recommended_price_cents: 1450,
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
    };

    const baseInput = {
        baseline,
        freshness: 0.91,
        outlierPressure: 0,
    };

    const healthy = assessMarketEvidence({
        ...baseInput,
        dispersion: {
            median: 1450,
            mad: 150,
            standard_deviation: 197.2,
        },
    });

    const ugly = assessMarketEvidence({
        ...baseInput,
        dispersion: {
            median: 1450,
            mad: 150,
            standard_deviation: 1051.45,
        },
    });

    console.table([
        {
            case: "C — mild outlier",
            tailShape: healthy.tail_shape,
        },
        {
            case: "B — extreme outlier",
            tailShape: ugly.tail_shape,
        },
    ]);

    assert.equal(healthy.tail_shape, "normal");
    assert.equal(ugly.tail_shape, "heavy");
});
