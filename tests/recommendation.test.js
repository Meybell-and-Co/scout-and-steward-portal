import test from "node:test";
import assert from "node:assert/strict";

import {
    buildPriceRecommendation,
    buildAndPersistPriceRecommendation
} from "../src/services/recommendation.js";

const TEST_NOW = new Date("2026-08-10T12:00:00Z");

test("builds a final price recommendation from market evidence", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "exact",
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "exact",
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-07-25T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "exact",
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-07-20T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            total_buyer_cost_cents: 1700,
            item_origin_date: "2025-12-01T12:00:00Z"
        }
    ];

    const result = buildPriceRecommendation(
        comps,
        TEST_NOW
    );

    assert.equal(result.market.evidence_sufficient, true);
    assert.equal(result.market.market_baseline_cents, 1500);
    assert.equal(result.market.evidence_window_days, 90);

    assert.ok(result.pricing);
    assert.equal(
        result.recommended_price_cents,
        result.pricing.recommended_price_cents
    );

    assert.equal(
    result.recommended_price_cents,
    Math.max(
        0,
        result.pricing.adjusted_market_value_cents -
            result.pricing.shipping_allowance_cents
    )
);
});

test("does not calculate final pricing without sufficient market evidence", () => {
    const result = buildPriceRecommendation(
        [
            {
                market_status: "sold",
                comp_tier: "same_issue",
                total_buyer_cost_cents: 1500,
                item_origin_date: "2026-08-01T12:00:00Z"
            }
        ],
        TEST_NOW
    );

    assert.equal(result.market.evidence_sufficient, false);
    assert.equal(result.pricing, null);
    assert.equal(result.recommended_price_cents, null);
});


test("builds and persists the final recommendation", async () => {
    const capturedBindings = [];

    const db = {
        prepare(sql) {
            return {
                bind(...bindings) {
                    capturedBindings.push({
                        sql,
                        bindings
                    });

                    return {
                        async run() {},
                        async first() {
                            return {
                                snapshot_id:
                                    "SNAPSHOT_PIPELINE_0001"
                            };
                        }
                    };
                }
            };
        }
    };

    const comps = [
        {
            compId: "COMP_PIPELINE_0001",
            source: "ebay",
            title: "Gene Washington 1971 Topps Football Pin-Ups #23",
            priceCents: 1500,
            shippingCents: 0,
            marketStatus: "sold",
            itemOriginDate: "2026-08-01T12:00:00Z",
            compTier: "exact"
        },
        {
            compId: "COMP_PIPELINE_0002",
            source: "ebay",
            title: "Gene Washington 1971 Topps Football Pin-Ups #23",
            priceCents: 1500,
            shippingCents: 0,
            marketStatus: "sold",
            itemOriginDate: "2026-07-25T12:00:00Z",
            compTier: "exact"
        },
        {
            compId: "COMP_PIPELINE_0003",
            source: "ebay",
            title: "Gene Washington 1971 Topps Football Pin-Ups #23",
            priceCents: 1500,
            shippingCents: 0,
            marketStatus: "sold",
            itemOriginDate: "2026-07-20T12:00:00Z",
            compTier: "exact"
        }
    ];

    const result = await buildAndPersistPriceRecommendation(
        db,
        {
            recommendationId: "REC_PIPELINE_0001",
            itemId: "FBPU_0001",
            comps,
            now: TEST_NOW
        }
    );

    assert.ok(result.recommended_price_cents);
    assert.ok(capturedBindings.length >= 3);

    const recommendationInsert =
        capturedBindings.find((entry) =>
            entry.sql.includes("INSERT INTO price_recommendations")
        );

    assert.ok(recommendationInsert);

    assert.equal(
        recommendationInsert.bindings[0],
        "REC_PIPELINE_0001"
    );
    assert.equal(
        recommendationInsert.bindings[1],
        "FBPU_0001"
    );
    assert.equal(
        recommendationInsert.bindings[2],
        result.recommended_price_cents
    );

    const observationInsert =
        capturedBindings.find((entry) =>
            entry.sql.includes("INSERT INTO market_observations")
        );

    assert.ok(observationInsert);
    assert.equal(
        observationInsert.bindings[1],
        "SNAPSHOT_PIPELINE_0001"
    );

    const compsInsert =
        capturedBindings.find((entry) =>
            entry.sql.includes("INSERT INTO market_comps")
        );

    assert.ok(compsInsert);
    assert.equal(
        compsInsert.bindings[2],
        "COMP_PIPELINE_0001"
    );
});

test("does not persist when market evidence is insufficient", async () => {
    let prepareCalled = false;

    const db = {
        prepare() {
            prepareCalled = true;
            throw new Error("database should not be called");
        }
    };

    const result = await buildAndPersistPriceRecommendation(
        db,
        {
            recommendationId: "REC_PIPELINE_0002",
            itemId: "FBPU_0001",
            comps: [
                {
                    compId: "COMP_PIPELINE_0004",
                    source: "ebay",
                    title: "Gene Washington comparable",
                    priceCents: 1500,
                    shippingCents: 0,
                    marketStatus: "sold",
                    itemOriginDate: "2026-08-01T12:00:00Z",
                    compTier: "same_issue"
                }
            ],
            now: TEST_NOW
        }
    );

    assert.equal(result.recommended_price_cents, null);
    assert.equal(prepareCalled, false);
});
