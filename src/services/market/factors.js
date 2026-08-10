function createFactor(factorCode, score) {
    return {
        factor_code: factorCode,
        score,
        direction:
            score > 0
                ? "up"
                : score < 0
                    ? "down"
                    : "neutral"
    };
}

function resolveScarcityScore(activeToSoldRatio) {
    if (activeToSoldRatio === null || activeToSoldRatio === undefined) {
        return 0;
    }

    if (activeToSoldRatio === 0) {
        return 3;
    }

    if (activeToSoldRatio <= 0.5) {
        return 2;
    }

    if (activeToSoldRatio < 2 / 3) {
        return 1;
    }

    if (activeToSoldRatio <= 1.25) {
        return 0;
    }

    if (activeToSoldRatio <= 2) {
        return -1;
    }

    if (activeToSoldRatio <= 3) {
        return -2;
    }

    return -3;
}

export function resolvePricingFactors({
    item = {},
    competition = {}
}) {
    const conditionScore = 0;
    const playerSignificanceScore = 0;

    const scarcityScore = resolveScarcityScore(
        competition.active_to_sold_ratio ?? null
    );

    const marketActivityScore =
        Number.isInteger(competition.market_activity_score)
            ? competition.market_activity_score
            : 0;

    return {
        condition: createFactor(
            "condition",
            conditionScore
        ),

        player_significance: createFactor(
            "player_significance",
            playerSignificanceScore
        ),

        scarcity: createFactor(
            "scarcity",
            scarcityScore
        ),

        market_activity: createFactor(
            "market_activity",
            marketActivityScore
        )
    };
}
