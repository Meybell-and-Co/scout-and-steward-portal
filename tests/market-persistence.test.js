import test from "node:test";
import assert from "node:assert/strict";

import {
    persistPriceRecommendation
} from "../src/services/market/persistence.js";

test("persists a sufficient final price recommendation", async () => {
    let capturedSql = null;
    let capturedBindings = null;
    let runCalled = false;

    const db = {
        prepare(sql) {
            capturedSql = sql;

            return {
                bind(...bindings) {
                    capturedBindings = bindings;

                    return {
                        async run() {
                            runCalled = true;
                        }
                    };
                }
            };
        }
    };

    const recommendation = {
        market: {
            evidence_sufficient: true,
            confidence: {
            rating: 4,
            label: "High"
        },
            evidence_window_days: 90,
            market_baseline_cents: 1500,
            pricing_factors: {
                condition: {
                    score: 0,
                    direction: "neutral"
                },
                scarcity: {
                    score: 2,
                    direction: "up"
                }
            }
        },
        pricing: {
            adjusted_market_value_cents: 1800,
            shipping_allowance_cents: 1000,
            recommended_price_cents: 2800,
            factors: [
                {
                    factor_code: "scarcity",
                    score: 2,
                    direction: "up"
                }
            ]
        },
        recommended_price_cents: 2800
    };

    await persistPriceRecommendation(db, {
        recommendationId: "REC_TEST_0001",
        itemId: "FBPU_0001",
        recommendation,
        evidence: {
            sold_count: 3,
            active_count: 1
        }
    });

    assert.match(
        capturedSql,
        /INSERT INTO price_recommendations/
    );

    assert.equal(capturedBindings[0], "REC_TEST_0001");
    assert.equal(capturedBindings[1], "FBPU_0001");
    assert.equal(capturedBindings[2], 2800);
    assert.deepEqual(
    JSON.parse(capturedBindings[3]),
    recommendation.market.confidence
);
    assert.equal(capturedBindings[4], 90);

    assert.deepEqual(
        JSON.parse(capturedBindings[5]),
        {
            market: recommendation.market.pricing_factors,
            pricing: recommendation.pricing.factors
        }
    );

    assert.deepEqual(
        JSON.parse(capturedBindings[6]),
        {
            sold_count: 3,
            active_count: 1,
            market_baseline_cents: 1500,
            adjusted_market_value_cents: 1800,
            shipping_allowance_cents: 1000
        }
    );

    assert.equal(runCalled, true);
});

test("refuses to persist an insufficient final recommendation", async () => {
    const db = {
        prepare() {
            throw new Error("database should not be called");
        }
    };

    await assert.rejects(
        persistPriceRecommendation(db, {
            recommendationId: "REC_TEST_0002",
            itemId: "FBPU_0001",
            recommendation: {
                market: {
                    evidence_sufficient: false
                },
                pricing: null,
                recommended_price_cents: null
            }
        }),
        /a sufficient final price recommendation is required/
    );
});
