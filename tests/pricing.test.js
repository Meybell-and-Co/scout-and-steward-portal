import test from "node:test";
import assert from "node:assert/strict";

import { calculatePriceRecommendation } from "../src/services/pricing.js";

test("calculates a normal recommendation", () => {
    const result = calculatePriceRecommendation({
        recentCompsCents: 2000,
        factorScores: {
            condition: -2,
            player_significance: 0,
            scarcity: 1,
            market_activity: -2
        }
    });

    assert.equal(result.total_modifier_cents, -600);
    assert.equal(result.adjusted_market_value_cents, 1400);
    assert.equal(result.shipping_allowance_cents, 1000);
    assert.equal(result.recommended_price_cents, 2400);
});

test("neutral factors return baseline plus shipping", () => {
    const result = calculatePriceRecommendation({
        recentCompsCents: 2000,
        factorScores: {
            condition: 0,
            player_significance: 0,
            scarcity: 0,
            market_activity: 0
        }
    });

    assert.equal(result.total_modifier_cents, 0);
    assert.equal(result.adjusted_market_value_cents, 2000);
    assert.equal(result.recommended_price_cents, 3000);
});

test("maximum negative pressure produces the expected result", () => {
    const result = calculatePriceRecommendation({
        recentCompsCents: 2000,
        factorScores: {
            condition: -3,
            player_significance: -3,
            scarcity: -3,
            market_activity: -3
        }
    });

    assert.equal(result.total_modifier_cents, -1800);
    assert.equal(result.adjusted_market_value_cents, 200);
    assert.equal(result.recommended_price_cents, 1200);
});

test("maximum positive pressure produces the expected result", () => {
    const result = calculatePriceRecommendation({
        recentCompsCents: 2000,
        factorScores: {
            condition: 3,
            player_significance: 3,
            scarcity: 3,
            market_activity: 3
        }
    });

    assert.equal(result.total_modifier_cents, 1800);
    assert.equal(result.adjusted_market_value_cents, 3800);
    assert.equal(result.recommended_price_cents, 4800);
});

test("invalid factor scores are rejected", () => {
    assert.throws(
        () =>
            calculatePriceRecommendation({
                recentCompsCents: 2000,
                factorScores: {
                    condition: 4
                }
            }),
        /condition score must be an integer between -3 and 3/
    );
});

test("invalid comp baselines are rejected", () => {
    assert.throws(
        () =>
            calculatePriceRecommendation({
                recentCompsCents: 0,
                factorScores: {}
            }),
        /recentCompsCents must be a positive integer/
    );
});
