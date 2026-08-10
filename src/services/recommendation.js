import {
    buildMarketRecommendation
} from "./market/recommend.js";

import {
    calculatePriceRecommendation
} from "./pricing.js";

import {
    persistPriceRecommendation
} from "./market/persistence.js";

const FACTOR_CODES = [
    "condition",
    "player_significance",
    "scarcity",
    "market_activity"
];

export function buildPriceRecommendation(
    comps,
    now = new Date()
) {
    const market = buildMarketRecommendation(comps, now);

    if (
        market.evidence_sufficient !== true ||
        !Number.isInteger(market.market_baseline_cents)
    ) {
        return {
            market,
            pricing: null,
            recommended_price_cents: null
        };
    }

    const factorScores = Object.fromEntries(
        FACTOR_CODES.map((factorCode) => [
            factorCode,
            market.pricing_factors?.[factorCode]?.score ?? 0
        ])
    );

    const pricing = calculatePriceRecommendation({
        recentCompsCents: market.market_baseline_cents,
        factorScores
    });

    return {
        market,
        pricing,
        recommended_price_cents:
            pricing.recommended_price_cents
    };
}


export async function buildAndPersistPriceRecommendation(
    db,
    {
        recommendationId,
        itemId,
        comps,
        evidence = {},
        now = new Date()
    }
) {
    const recommendation = buildPriceRecommendation(
        comps,
        now
    );

    if (recommendation.recommended_price_cents === null) {
        return recommendation;
    }

    await persistPriceRecommendation(db, {
        recommendationId,
        itemId,
        recommendation,
        evidence
    });

    return recommendation;
}
