import test from "node:test";

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
}

function standardDeviation(values) {
    const mean =
        values.reduce((sum, value) => sum + value, 0) /
        values.length;

    const variance =
        values.reduce(
            (sum, value) => sum + (value - mean) ** 2,
            0
        ) / values.length;

    return Math.sqrt(variance);
}

function medianAbsoluteDeviation(values) {
    const center = median(values);

    return median(
        values.map((value) => Math.abs(value - center))
    );
}

test("A/B/C/D: compare robust and total dispersion", () => {
    const cases = {
        A: [1200, 1300, 1400, 1500, 1600],
        C: [1200, 1300, 1400, 1500, 1600, 1800],
        B: [1200, 1300, 1400, 1500, 1600, 4200],
        D: [800, 1100, 1400, 1700, 2000],
    };

    const results = Object.entries(cases).map(([name, prices]) => {
        const med = median(prices);
        const mad = medianAbsoluteDeviation(prices);
        const sd = standardDeviation(prices);

        return {
            case: name,
            median: med,
            mad,
            standardDeviation: Number(sd.toFixed(2)),
            sdToMadRatio:
                mad === 0
                    ? null
                    : Number((sd / mad).toFixed(2)),
        };
    });

    console.table(results);
});
