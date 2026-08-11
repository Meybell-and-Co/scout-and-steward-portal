export async function persistPriceRecommendation(
    db,
    {
        recommendationId,
        itemId,
        recommendation,
        evidence = {}
    }
) {
    if (!db) {
        throw new Error("db is required");
    }

    if (!recommendationId) {
        throw new Error("recommendationId is required");
    }

    if (!itemId) {
        throw new Error("itemId is required");
    }

    if (
        !recommendation ||
        !recommendation.market ||
        !recommendation.pricing ||
        recommendation.market.evidence_sufficient !== true ||
        !Number.isInteger(recommendation.recommended_price_cents)
    ) {
        throw new Error(
            "a sufficient final price recommendation is required"
        );
    }

    const persistedFactors = {
        market: recommendation.market.pricing_factors ?? {},
        pricing: recommendation.pricing.factors ?? []
    };

    const persistedEvidence = {
        ...evidence,
        market_baseline_cents:
            recommendation.market.market_baseline_cents,
        adjusted_market_value_cents:
            recommendation.pricing.adjusted_market_value_cents,
        shipping_allowance_cents:
            recommendation.pricing.shipping_allowance_cents
    };

    await db
        .prepare(`
            INSERT INTO price_recommendations (
                recommendation_id,
                item_id,
                recommended_price_cents,
                confidence,
                evidence_window_days,
                factors_json,
                evidence_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
            recommendationId,
            itemId,
            recommendation.recommended_price_cents,
            JSON.stringify(recommendation.market.confidence),
            recommendation.market.evidence_window_days,
            JSON.stringify(persistedFactors),
            JSON.stringify(persistedEvidence)
        )
        .run();
}
