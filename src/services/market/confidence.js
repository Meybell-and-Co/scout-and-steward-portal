export function calculateMarketConfidence(evidence) {
    if (evidence?.evidence_sufficient !== true) {
        return {
            rating: null,
            label: "Insufficient evidence"
        };
    }

    if (
        evidence.tier_code === "category_era" &&
        evidence.sold_used <= 5 &&
        evidence.price_agreement === "weak" &&
        evidence.observation_window_days === 365
    ) {
        return {
            rating: 1,
            label: "Low"
        };
    }

    if (
        evidence.price_agreement === "strong" &&
        evidence.observation_window_days === 180
    ) {
        return {
            rating: 2,
            label: "Guarded"
        };
    }

    if (
        evidence.tier_code === "same_issue" &&
        evidence.sold_used >= 8 &&
        evidence.agreement_ratio >= 0.95 &&
        evidence.price_agreement === "strong" &&
        evidence.observation_window_days === 90 &&
        evidence.window_expanded === false
    ) {
        return {
            rating: 5,
            label: "Very High"
        };
    }

    if (
        evidence.tier_code === "exact" &&
        evidence.sold_used >= 3 &&
        evidence.agreement_ratio >= 0.90 &&
        evidence.price_agreement === "strong" &&
        evidence.observation_window_days === 90 &&
        evidence.window_expanded === false
    ) {
        return {
            rating: 4,
            label: "High"
        };
    }

    if (
        evidence.price_agreement === "strong" &&
        evidence.observation_window_days === 90
    ) {
        return {
            rating: 3,
            label: "Moderate"
        };
    }

    return {
        rating: 1,
        label: "Low"
    };
}
