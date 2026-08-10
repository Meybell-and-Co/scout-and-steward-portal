import test from "node:test";
import assert from "node:assert/strict";

import { buildMarketRecommendation } from "../src/services/market/recommend.js";

const TEST_NOW = new Date("2026-08-10T12:00:00Z");

test("builds a recommendation using the strongest defensible comparable tier", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "exact",
            price_cents: 1200,
            shipping_cents: 300,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1400,
            shipping_cents: 100,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-07-20T12:00:00Z"
        }
    ];

    const result = buildMarketRecommendation(comps, TEST_NOW);

    assert.equal(result.tier_code, "exact");
    assert.equal(result.evidence_quality, "strong");
    assert.equal(result.evidence_sufficient, true);
assert.equal(result.evidence_window_days, 90);
    assert.equal(result.market_baseline_cents, 1500);
    assert.equal(result.recommended_price_cents, 1500);
});
test("falls back to the next defensible tier when stronger evidence is insufficient", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1200,
            shipping_cents: 300,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1300,
            shipping_cents: 200,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-07-25T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1400,
            shipping_cents: 100,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-07-20T12:00:00Z"
        }
    ];

    const result = buildMarketRecommendation(comps, TEST_NOW);

    assert.equal(result.tier_code, "same_issue");
    assert.equal(result.evidence_quality, "strong");
    assert.equal(result.evidence_sufficient, true);
    assert.equal(result.market_baseline_cents, 1500);
    assert.equal(result.recommended_price_cents, 1500);
});
test("does not recommend a price when no comparable tier has sufficient evidence", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1200,
            shipping_cents: 300,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-08-01T12:00:00Z"
        }
    ];

    const result = buildMarketRecommendation(comps, TEST_NOW);

    assert.equal(result.tier_code, null);
    assert.equal(result.evidence_quality, "insufficient");
    assert.equal(result.evidence_sufficient, false);
    assert.equal(result.market_baseline_cents, null);
    assert.equal(result.recommended_price_cents, null);
});
test("includes market competition evidence in the recommendation", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "exact",
            price_cents: 1200,
            shipping_cents: 300,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "exact",
            price_cents: 1300,
            shipping_cents: 200,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-07-25T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "exact",
            price_cents: 1400,
            shipping_cents: 100,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-07-20T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            price_cents: 1400,
            shipping_cents: 300,
            total_buyer_cost_cents: 1700,
            item_origin_date: "2025-12-01T12:00:00Z"
        }
    ];

    const result = buildMarketRecommendation(
        comps,
        TEST_NOW
    );

    assert.equal(result.tier_code, "exact");
    assert.equal(result.market_baseline_cents, 1500);
    assert.equal(result.market_activity_score, 1);
    assert.equal(result.market_activity_label, "Healthy activity");
    assert.equal(result.active_observed, 1);
    assert.equal(result.sold_observed, 3);
    assert.equal(result.active_to_sold_ratio, 1 / 3);
});
test("includes pricing factor evidence in the recommendation", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "exact",
            price_cents: 1200,
            shipping_cents: 300,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "exact",
            price_cents: 1300,
            shipping_cents: 200,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-07-25T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "exact",
            price_cents: 1400,
            shipping_cents: 100,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-07-20T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            price_cents: 1400,
            shipping_cents: 300,
            total_buyer_cost_cents: 1700,
            item_origin_date: "2025-12-01T12:00:00Z"
        }
    ];

    const result = buildMarketRecommendation(
        comps,
        TEST_NOW
    );

    assert.equal(result.pricing_factors.condition.score, 0);
    assert.equal(result.pricing_factors.condition.direction, "neutral");

    assert.equal(
        result.pricing_factors.player_significance.score,
        0
    );
    assert.equal(
        result.pricing_factors.player_significance.direction,
        "neutral"
    );

    assert.equal(result.pricing_factors.scarcity.score, 2);
    assert.equal(result.pricing_factors.scarcity.direction, "up");

    assert.equal(result.pricing_factors.market_activity.score, 1);
    assert.equal(
        result.pricing_factors.market_activity.direction,
        "up"
    );
});

