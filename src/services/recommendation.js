import {
    buildMarketRecommendation
} from "./market/recommend.js";

import {
    calculatePriceRecommendation
} from "./pricing.js";

import {
    persistPriceRecommendation,
    persistMarketObservation,
    persistMarketComps
} from "./market/persistence.js";

import {
    normalizeMarketComp
} from "./market/normalize.js";

import {
    scoreMarketComp
} from "./market/score.js";

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
    const scoredComps = comps.map((comp) =>
        scoreMarketComp(
            normalizeMarketComp(comp),
            now
        )
    );

    const recommendation = buildPriceRecommendation(
        scoredComps,
        now
    );

    if (recommendation.recommended_price_cents === null) {
        return recommendation;
    }

    const currentSnapshot = await db
        .prepare(`
            SELECT s.snapshot_id
            FROM inventory_snapshots AS s
            INNER JOIN publications AS p
                ON p.publication_id = s.publication_id
            WHERE s.item_id = ?
              AND p.status = 'completed'
              AND NOT EXISTS (
                  SELECT 1
                  FROM inventory_snapshots AS newer_s
                  INNER JOIN publications AS newer_p
                      ON newer_p.publication_id = newer_s.publication_id
                  WHERE newer_s.item_id = s.item_id
                    AND newer_p.status = 'completed'
                    AND (
                        newer_p.published_at > p.published_at
                        OR (
                            newer_p.published_at = p.published_at
                            AND newer_s.snapshot_id > s.snapshot_id
                        )
                    )
              )
            LIMIT 1
        `)
        .bind(itemId)
        .first();

    if (!currentSnapshot?.snapshot_id) {
        throw new Error(
            "current inventory snapshot not found"
        );
    }

    const observationId = crypto.randomUUID();

    await persistMarketObservation(db, {
        observationId,
        snapshotId: currentSnapshot.snapshot_id,
        itemId,
        observedAt: now.toISOString()
    });

    await persistMarketComps(
        db,
        observationId,
        scoredComps
    );

    await persistPriceRecommendation(db, {
        recommendationId,
        itemId,
        recommendation,
        evidence
    });

    return recommendation;
}
