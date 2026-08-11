import { classifyTailShape } from "./tail-shape.js";

export function assessMarketEvidence({
    baseline,
    freshness,
    dispersion,
    outlierPressure,
}) {
    if (!baseline) {
        throw new Error("Market baseline is required");
    }

    const medianCents = dispersion?.median ?? null;
    const madCents = dispersion?.mad ?? null;
    const standardDeviationCents =
        dispersion?.standard_deviation ?? null;

    const sdToMadRatio =
        Number.isFinite(madCents) &&
        madCents > 0 &&
        Number.isFinite(standardDeviationCents)
            ? standardDeviationCents / madCents
            : null;

    const tailShape = classifyTailShape(sdToMadRatio);

    return {
        baseline_cents: baseline.recommended_price_cents,
        tier_code: baseline.tier_code,
        sold_used: baseline.sold_used,
        eligible_sold_count: baseline.eligible_sold_count,
        active_observed: baseline.active_observed,
        observation_window_days: baseline.observation_window_days,
        representative_count: baseline.representative_count,
        unusual_count: baseline.unusual_count,
        agreement_ratio: baseline.agreement_ratio,
        price_agreement: baseline.price_agreement,
        window_expanded: baseline.window_expanded,
        evidence_sufficient: baseline.evidence_sufficient,
        freshness_strength: freshness,
        median_cents: medianCents,
        mad_cents: madCents,
        standard_deviation_cents: standardDeviationCents,
        outlier_pressure: outlierPressure ?? null,
        tail_shape: tailShape,
    };
}
