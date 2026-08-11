export function calculateMarketConfidence(evidence) {
    if (evidence?.evidence_sufficient !== true) {
        return {
            rating: null,
            label: "Insufficient evidence"
        };
    }

    let rating;

    if (
        evidence.tier_code === "category_era" &&
        evidence.sold_used <= 5 &&
        evidence.price_agreement === "weak" &&
        evidence.observation_window_days === 365
    ) {
        rating = 1;
    } else if (
        evidence.price_agreement === "strong" &&
        evidence.observation_window_days === 180
    ) {
        rating = 2;
    } else if (
        evidence.tier_code === "same_issue" &&
        evidence.sold_used >= 8 &&
        evidence.agreement_ratio >= 0.95 &&
        evidence.price_agreement === "strong" &&
        evidence.observation_window_days === 90 &&
        evidence.window_expanded === false
    ) {
        rating = 5;
    } else if (
        evidence.tier_code === "exact" &&
        evidence.sold_used >= 3 &&
        evidence.agreement_ratio >= 0.90 &&
        evidence.price_agreement === "strong" &&
        evidence.observation_window_days === 90 &&
        evidence.window_expanded === false
    ) {
        rating = 4;
    } else if (
        evidence.price_agreement === "strong" &&
        evidence.observation_window_days === 90
    ) {
        rating = 3;
    } else {
        rating = 1;
    }

    const hasCoverageData =
        Number.isFinite(evidence.sold_used) &&
        Number.isFinite(evidence.eligible_sold_count) &&
        evidence.eligible_sold_count > 0;

    if (
        hasCoverageData &&
        evidence.eligible_sold_count >= 5 &&
        evidence.sold_used / evidence.eligible_sold_count < 0.80
    ) {
        rating -= 1;
    }

    if (
        Number.isFinite(evidence.outlier_pressure) &&
        evidence.outlier_pressure >= 0.40
    ) {
        rating -= 1;
    }

    rating = Math.max(1, Math.min(5, rating));

    const labels = {
        1: "Low",
        2: "Guarded",
        3: "Moderate",
        4: "High",
        5: "Very High",
    };

    return {
        rating,
        label: labels[rating],
    };
}
