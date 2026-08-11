const NORMAL_SD_TO_MAD_RATIO = 1.4826;
const EXTREME_SD_TO_MAD_RATIO = 7;

export function calculateOutlierPressure(
    standardDeviation,
    medianAbsoluteDeviation
) {
    if (
        !Number.isFinite(standardDeviation) ||
        !Number.isFinite(medianAbsoluteDeviation) ||
        medianAbsoluteDeviation <= 0
    ) {
        return null;
    }

    const ratio =
        standardDeviation / medianAbsoluteDeviation;

    const pressure =
        (ratio - NORMAL_SD_TO_MAD_RATIO) /
        (EXTREME_SD_TO_MAD_RATIO - NORMAL_SD_TO_MAD_RATIO);

    return Math.min(1, Math.max(0, pressure));
}
