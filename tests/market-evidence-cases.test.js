import test from "node:test";

import {
    assessMarketEvidence
} from "../src/services/market/evidence.js";

test("Case A/B: same baseline, different evidence quality", () => {
    const caseA = assessMarketEvidence({
        baseline: {
            recommended_price_cents: 1450,
            sold_used: 6,
            eligible_sold_count: 6,
            active_observed: 3,
            observation_window_days: 90,
            representative_count: 6,
            unusual_count: 0,
            agreement_ratio: 1,
            price_agreement: "strong",
            window_expanded: false,
            evidence_sufficient: true,
        },
        freshness: 0.91,
        dispersion: {
            median: 1450,
            mad: 100,
            standard_deviation: 141.42,
        },
        outlierPressure: 0,
    });

    const caseB = assessMarketEvidence({
        baseline: {
            recommended_price_cents: 1450,
            sold_used: 6,
            eligible_sold_count: 6,
            active_observed: 3,
            observation_window_days: 90,
            representative_count: 5,
            unusual_count: 1,
            agreement_ratio: 5 / 6,
            price_agreement: "strong",
            window_expanded: false,
            evidence_sufficient: true,
        },
        freshness: 0.91,
        dispersion: {
            median: 1450,
            mad: 150,
            standard_deviation: 1051.45,
        },
        outlierPressure: 0.92,
    });

    console.table([
        {
            case: "A — healthy",
            baseline: caseA.baseline_cents,
            soldUsed: caseA.sold_used,
            agreement: caseA.agreement_ratio,
            freshness: caseA.freshness_strength,
            mad: caseA.mad_cents,
            sd: caseA.standard_deviation_cents,
            outlierPressure: caseA.outlier_pressure,
        },
        {
            case: "B — ugly",
            baseline: caseB.baseline_cents,
            soldUsed: caseB.sold_used,
            agreement: caseB.agreement_ratio,
            freshness: caseB.freshness_strength,
            mad: caseB.mad_cents,
            sd: caseB.standard_deviation_cents,
            outlierPressure: caseB.outlier_pressure,
        },
    ]);
});
