import test from "node:test";
import assert from "node:assert/strict";

import { resolvePricingFactors } from "../src/services/market/factors.js";

test("uses neutral scores when V1 has no condition or player significance evidence", () => {
    const result = resolvePricingFactors({
        item: {
            condition: {
                overall: null,
                observations: []
            }
        },
        competition: {
            active_to_sold_ratio: 1,
            market_activity_score: 0
        }
    });

    assert.equal(result.condition.score, 0);
    assert.equal(result.player_significance.score, 0);
    assert.equal(result.scarcity.score, 0);
    assert.equal(result.market_activity.score, 0);
});

test("uses market activity score directly", () => {
    const result = resolvePricingFactors({
        item: {},
        competition: {
            active_to_sold_ratio: 0.5,
            market_activity_score: 1
        }
    });

    assert.equal(result.market_activity.score, 1);
});

test("reports observed scarcity when active supply is very limited", () => {
    const result = resolvePricingFactors({
        item: {},
        competition: {
            active_to_sold_ratio: 0.5,
            market_activity_score: 1
        }
    });

    assert.equal(result.scarcity.score, 2);
});

test("reports strong observed scarcity when no active supply is observed", () => {
    const result = resolvePricingFactors({
        item: {},
        competition: {
            active_to_sold_ratio: 0,
            market_activity_score: 1
        }
    });

    assert.equal(result.scarcity.score, 3);
});

test("reports observed abundance when active supply greatly exceeds sales", () => {
    const result = resolvePricingFactors({
        item: {},
        competition: {
            active_to_sold_ratio: 3,
            market_activity_score: -2
        }
    });

    assert.equal(result.scarcity.score, -2);
});

test("does not infer scarcity when no sales are observed", () => {
    const result = resolvePricingFactors({
        item: {},
        competition: {
            active_to_sold_ratio: null,
            market_activity_score: null
        }
    });

    assert.equal(result.scarcity.score, 0);
    assert.equal(result.market_activity.score, 0);
});

test("returns factor evidence suitable for the recommendation UI", () => {
    const result = resolvePricingFactors({
        item: {},
        competition: {
            active_to_sold_ratio: 0.5,
            market_activity_score: 1
        }
    });

    assert.equal(result.scarcity.factor_code, "scarcity");
    assert.equal(result.scarcity.direction, "up");
    assert.equal(result.market_activity.factor_code, "market_activity");
    assert.equal(result.market_activity.direction, "up");
});
