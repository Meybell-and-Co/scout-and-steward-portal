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

export async function persistMarketObservation(
    db,
    {
        observationId,
        snapshotId,
        itemId,
        observedAt,
    }
) {
    await db
        .prepare(
            `INSERT INTO market_observations (
                observation_id,
                snapshot_id,
                item_id,
                observed_at
            ) VALUES (?, ?, ?, ?)`
        )
        .bind(
            observationId,
            snapshotId,
            itemId,
            observedAt
        )
        .run();

    return {
        observationId,
        snapshotId,
        itemId,
        observedAt,
    };
}


export async function persistMarketComps(
    db,
    observationId,
    comps
) {
    if (!Array.isArray(comps) || comps.length === 0) {
        throw new Error(
            "Market comps must be a non-empty array."
        );
    }

    for (const comp of comps) {
        await db
            .prepare(
                `INSERT INTO market_comps (
                    comp_record_id,
                    observation_id,
                    comp_id,
                    source,
                    title,
                    price_cents,
                    shipping_cents,
                    total_buyer_cost_cents,
                    market_status,
                    condition,
                    item_origin_date,
                    comp_tier,
                    evidence_score,
                    evidence_reasons_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
                crypto.randomUUID(),
                observationId,
                comp.comp_id,
                comp.source,
                comp.title,
                comp.price_cents,
                comp.shipping_cents,
                comp.total_buyer_cost_cents,
                comp.market_status,
                comp.condition ?? null,
                comp.item_origin_date ?? null,
                comp.comp_tier,
                comp.evidence_score ?? 0,
                JSON.stringify(
                    comp.evidence_reasons ?? []
                )
            )
            .run();
    }

    return {
        observationId,
        count: comps.length,
    };
}
