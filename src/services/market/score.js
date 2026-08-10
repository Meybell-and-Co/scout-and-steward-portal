import { BUSINESS_RULES } from "../../config/business-rules.js";

/**
 * Assigns an evidence score to a normalized market comp.
 *
 * Higher score = stronger evidence for pricing.
 */
export function scoreMarketComp(comp, now = new Date()) {
    if (!comp) {
        throw new Error("Market comp is required");
    }

    let score = 0;
    const reasons = [];

    // Match quality

    const matchReasons = {
        exact: "Exact item match",
        same_issue: "Same issue with comparable subject",
        same_player_era: "Same player with broadly comparable card from the same era",
        category_era: "Similar card category and era",
    };

    const matchPoints =
        BUSINESS_RULES.COMP_EVIDENCE_SCORES[comp.comp_tier];

    const matchReason = matchReasons[comp.comp_tier];

    if (matchPoints && matchReason) {
        score += matchPoints;

        reasons.push({
            factor: "match",
            points: matchPoints,
            reason: matchReason,
        });
    }

    // Market evidence quality
    if (comp.market_status === "sold") {
        score += 25;

        reasons.push({
            factor: "market_status",
            points: 25,
            reason: "Completed sale",
        });
    }

    // Evidence freshness
    if (comp.item_origin_date) {
        const originDate = new Date(comp.item_origin_date);

        if (!Number.isNaN(originDate.getTime())) {
            const ageMs = now.getTime() - originDate.getTime();
            const ageDays = ageMs / (1000 * 60 * 60 * 24);

            let freshnessPoints = 0;

            if (ageDays <= 30) {
                freshnessPoints = 20;
            } else if (ageDays <= 90) {
                freshnessPoints = 15;
            } else if (ageDays <= 180) {
                freshnessPoints = 10;
            } else if (ageDays <= 365) {
                freshnessPoints = 5;
            }

            if (freshnessPoints > 0) {
                score += freshnessPoints;

                reasons.push({
                    factor: "freshness",
                    points: freshnessPoints,
                    reason: `Market evidence is ${Math.floor(ageDays)} days old`,
                });
            }
        }
    }

    // Active listing age
    if (comp.market_status === "active" && comp.item_origin_date) {
        const originDate = new Date(comp.item_origin_date);

        if (!Number.isNaN(originDate.getTime())) {
            const ageMs = now.getTime() - originDate.getTime();
            const ageDays = ageMs / (1000 * 60 * 60 * 24);

            let listingAgePoints = 0;

            if (ageDays <= 30) {
                listingAgePoints = 10;
            } else if (ageDays <= 90) {
                listingAgePoints = 5;
            } else if (ageDays > 180) {
                listingAgePoints = -10;
            }

            if (listingAgePoints !== 0) {
                score += listingAgePoints;

                reasons.push({
                    factor: "listing_age",
                    points: listingAgePoints,
                    reason: `Active listing has been listed for ${Math.floor(ageDays)} days`,
                });
            }
        }
    }

    return {
        ...comp,
        evidence_score: score,
        evidence_reasons: reasons,
    };
}
