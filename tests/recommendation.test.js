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
        result.pricing.adjusted_market_value_cents +
            result.pricing.shipping_allowance_cents
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
    let capturedBindings = null;

    const db = {
        prepare() {
            return {
                bind(...bindings) {
                    capturedBindings = bindings;

                    return {
                        async run() {}
                    };
                }
            };
        }
    };

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
    assert.ok(capturedBindings);

    assert.equal(
        capturedBindings[0],
        "REC_PIPELINE_0001"
    );
    assert.equal(capturedBindings[1], "FBPU_0001");
    assert.equal(
        capturedBindings[2],
        result.recommended_price_cents
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
                    market_status: "sold",
                    comp_tier: "same_issue",
                    total_buyer_cost_cents: 1500,
                    item_origin_date: "2026-08-01T12:00:00Z"
                }
            ],
            now: TEST_NOW
        }
    );

    assert.equal(result.recommended_price_cents, null);
    assert.equal(prepareCalled, false);
});
