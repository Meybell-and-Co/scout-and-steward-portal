export function classifyTailShape(sdToMadRatio) {
    if (!Number.isFinite(sdToMadRatio)) {
        return "unknown";
    }

    if (sdToMadRatio >= 4) {
        return "heavy";
    }

    if (sdToMadRatio >= 2) {
        return "elevated";
    }

    return "normal";
}
