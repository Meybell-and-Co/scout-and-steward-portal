import { BUSINESS_RULES } from "../../config/business-rules.js";
import { calculateMarketBaseline } from "./baseline.js";
import { assessMarketCompetition } from "./competition.js";

/**
 * Builds a market recommendation from available comparable evidence.
 *
 * The recommendation uses the strongest comparable tier that has
 * sufficient sold evidence under the configured business rules.
 */
export function buildMarketRecommendation(
    comps,
    now = new Date()
) {
    if (!Array.isArray(comps)) {
        throw new Error("comps must be an array");
    }

    const tierCodes = Object.keys(
        BUSINESS_RULES.COMP_MINIMUM_REQUIREMENTS
    );

    for (const tierCode of tierCodes) {
        const tierComps = comps.filter(
            (comp) => comp.comp_tier === tierCode
        );

        const baseline = calculateMarketBaseline(
            tierComps,
            now,
            tierCode
        );

        if (!baseline.evidence_sufficient) {
            continue;
        }

        const competition = assessMarketCompetition(
            tierComps,
            now,
            tierCode
        );

        return {
            tier_code: tierCode,
            evidence_quality: baseline.price_agreement,
            evidence_sufficient: true,
            market_baseline_cents: baseline.baseline_cents,
            recommended_price_cents:
                baseline.recommended_price_cents,
            market_activity_score:
                competition.market_activity_score,
            market_activity_label:
                competition.market_activity_label,
            active_observed:
                competition.active_observed,
            sold_observed:
                competition.sold_observed,
            fresh_active_count:
                competition.fresh_active_count,
            aging_active_count:
                competition.aging_active_count,
            stale_active_count:
                competition.stale_active_count,
            active_to_sold_ratio:
                competition.active_to_sold_ratio,
        };
    }

    return {
        tier_code: null,
        evidence_quality: "insufficient",
        evidence_sufficient: false,
        market_baseline_cents: null,
        recommended_price_cents: null,
        market_activity_score: null,
        market_activity_label:
            "Insufficient market activity evidence",
        active_observed: 0,
        sold_observed: 0,
        fresh_active_count: 0,
        aging_active_count: 0,
        stale_active_count: 0,
        active_to_sold_ratio: null,
    };
}
