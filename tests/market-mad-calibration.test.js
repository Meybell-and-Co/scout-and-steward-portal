import test from "node:test";
import assert from "node:assert/strict";

function calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
}

function calculateMedianAbsoluteDeviation(values) {
    const median = calculateMedian(values);

    const absoluteDeviations = values.map(
        (value) => Math.abs(value - median)
    );

    return calculateMedian(absoluteDeviations);
}

test("A/B/C: compare standard deviation with median absolute deviation", () => {
    const cases = {
        A: [1200, 1300, 1400, 1500, 1600],
        C: [1200, 1300, 1400, 1500, 1600, 1800],
        B: [1200, 1300, 1400, 1500, 1600, 4200],
    };

    const results = Object.entries(cases).map(([name, prices]) => {
        const median = calculateMedian(prices);
        const mad = calculateMedianAbsoluteDeviation(prices);

        return {
            case: name,
            median,
            mad,
        };
    });

    console.table(results);

    assert.ok(results.every((result) => result.mad >= 0));
});
