export function classifyMarketCharacter(evidence) {
    if (evidence?.outlier_pressure >= 0.8) {
        return "extreme_outlier";
    }

    const medianCents = Number(evidence?.median_cents);
    const madCents = Number(evidence?.mad_cents);
    const agreementRatio = Number(evidence?.agreement_ratio);

    if (
        Number.isFinite(medianCents) &&
        medianCents > 0 &&
        Number.isFinite(madCents) &&
        madCents >= 0
    ) {
        const relativeMad = madCents / medianCents;

        if (
            agreementRatio >= 0.95 &&
            relativeMad <= 0.08 &&
            evidence.outlier_pressure < 0.2
        ) {
            return "tight";
        }

        if (relativeMad <= 0.18) {
            return "mild_outlier";
        }

        return "broad";
    }

    return "broad";
}
