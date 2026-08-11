export function calculateFreshnessStrength(ageDays) {
    if (!Number.isFinite(ageDays) || ageDays < 0) {
        return 0;
    }

    if (ageDays <= 30) {
        return 1;
    }

    const decayExponent = 1.538675;
    const decayRate = 0.000381;

    const strength =
        Math.exp(
            -decayRate *
            Math.pow(ageDays - 30, decayExponent)
        );

    return Math.max(0, strength);
}
