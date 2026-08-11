import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateFreshnessStrength
} from "../src/services/market/freshness.js";

test("freshness strength is highest for very recent evidence", () => {
    assert.equal(calculateFreshnessStrength(0), 1);
    assert.equal(calculateFreshnessStrength(30), 1);
});

test("freshness strength declines gradually as evidence ages", () => {
    const strengths = [
        30,
        90,
        180,
        270,
        365
    ].map(calculateFreshnessStrength);

    for (let i = 1; i < strengths.length; i += 1) {
        assert.ok(
            strengths[i] < strengths[i - 1],
            `Expected freshness to decline between ${i - 1} and ${i}`
        );
    }
});

test("freshness strength retains a diminishing long-tail value for historical evidence", () => {
    assert.ok(calculateFreshnessStrength(365) > 0);
    assert.ok(calculateFreshnessStrength(730) > 0);
    assert.ok(calculateFreshnessStrength(730) < 0.001);
});

test("invalid evidence age has no freshness strength", () => {
    assert.equal(calculateFreshnessStrength(-1), 0);
    assert.equal(calculateFreshnessStrength(NaN), 0);
    assert.equal(calculateFreshnessStrength(null), 0);
});
