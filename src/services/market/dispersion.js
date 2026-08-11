function calculateMean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateStandardDeviation(values) {
    const mean = calculateMean(values);

    const squaredDifferences = values.map(
        (value) => (value - mean) ** 2
    );

    const variance =
        squaredDifferences.reduce((sum, value) => sum + value, 0) /
        values.length;

    return Math.sqrt(variance);
}

function calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
}

export function calculatePriceDispersion(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return {
            median: null,
            standard_deviation: null,
        };
    }

    if (!values.every(Number.isFinite)) {
        return {
            median: null,
            standard_deviation: null,
        };
    }

    return {
        median: calculateMedian(values),
        standard_deviation: calculateStandardDeviation(values),
    };
}
