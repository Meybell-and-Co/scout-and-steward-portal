import { BUSINESS_RULES } from "../../config/business-rules.js";
import { calculateMarketBaseline } from "./baseline.js";

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

        return {
            tier_code: tierCode,
            evidence_quality: baseline.price_agreement,
            evidence_sufficient: true,
            market_baseline_cents: baseline.baseline_cents,
            recommended_price_cents:
                baseline.recommended_price_cents,
        };
    }

    return {
        tier_code: null,
        evidence_quality: "insufficient",
        evidence_sufficient: false,
        market_baseline_cents: null,
        recommended_price_cents: null,
    };
}
