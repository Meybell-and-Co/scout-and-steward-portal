import { BUSINESS_RULES } from "../config/business-rules.js";

const FACTOR_CODES = [
    "condition",
    "player_significance",
    "scarcity",
    "market_activity"
];

export function calculatePriceRecommendation({
    recentCompsCents,
    factorScores
}) {
    if (!Number.isInteger(recentCompsCents) || recentCompsCents <= 0) {
        throw new Error("recentCompsCents must be a positive integer");
    }

    if (!factorScores || typeof factorScores !== "object") {
        throw new Error("factorScores must be an object");
    }

    const { min, max } = BUSINESS_RULES.PRICING_STRENGTH_RANGE;

    const factors = FACTOR_CODES.map((factorCode) => {
        const score = factorScores[factorCode] ?? 0;

        if (!Number.isInteger(score) || score < min || score > max) {
            throw new Error(
                `${factorCode} score must be an integer between ${min} and ${max}`
            );
        }

        const weight = BUSINESS_RULES.PRICING_FACTOR_WEIGHTS[factorCode];

        const modifierCents = Math.round(
            recentCompsCents * weight * (score / max)
        );

        return {
            factor_code: factorCode,
            label: BUSINESS_RULES.PRICING_FACTOR_RUBRICS[factorCode].label,
            score,
            modifier_cents: modifierCents,
            direction:
                modifierCents > 0
                    ? "up"
                    : modifierCents < 0
                        ? "down"
                        : "neutral",
            explanation:
                BUSINESS_RULES.PRICING_FACTOR_RUBRICS[factorCode].scores[
                String(score)
                ]
        };
    });

    factors.sort((a, b) => b.modifier_cents - a.modifier_cents);

    const totalModifierCents = factors.reduce(
        (sum, factor) => sum + factor.modifier_cents,
        0
    );

    const adjustedMarketValueCents = Math.max(
        BUSINESS_RULES.MIN_ADJUSTED_MARKET_VALUE_CENTS,
        recentCompsCents + totalModifierCents
    );

    const shippingAllowanceCents =
        BUSINESS_RULES.SHIPPING_ALLOWANCE_CENTS;

    const recommendedPriceCents = Math.max(
        0,
        adjustedMarketValueCents - shippingAllowanceCents
    );

    return {
        recent_comps_cents: recentCompsCents,
        factors,
        total_modifier_cents: totalModifierCents,
        adjusted_market_value_cents: adjustedMarketValueCents,
        shipping_allowance_cents: shippingAllowanceCents,
        recommended_price_cents: recommendedPriceCents
    };
}
