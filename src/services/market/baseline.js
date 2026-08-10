import { BUSINESS_RULES } from "../../config/business-rules.js";

function calculateMedian(values) {
    if (values.length === 0) {
        return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 1) {
        return sorted[middle];
    }

    return Math.round(
        (sorted[middle - 1] + sorted[middle]) / 2
    );
}

/**
 * Builds a market baseline assessment from scored market comps.
 *
 * Sold comps provide evidence of demonstrated market value.
 * Active listings describe market competition and saturation and
 * do not participate in the sold-price baseline.
 */
export function calculateMarketBaseline(
    comps,
    now = new Date(),
    tierCode = null
) {
    if (!Array.isArray(comps)) {
        throw new Error("comps must be an array");
    }

    const soldComps = comps.filter(
        (comp) => comp.market_status === "sold"
    );

    const activeComps = comps.filter(
        (comp) => comp.market_status === "active"
    );

    const defaultWindowDays =
        BUSINESS_RULES.MARKET_BASELINE.defaultWindowDays;

    const observationWindows = [
        defaultWindowDays,
        180,
        365
    ];

    const minimumRequired =
        tierCode && BUSINESS_RULES.COMP_MINIMUM_REQUIREMENTS[tierCode]
            ? BUSINESS_RULES.COMP_MINIMUM_REQUIREMENTS[tierCode]
            : null;

    function soldCompsWithinWindow(windowDays) {
        const windowMs = windowDays * 24 * 60 * 60 * 1000;

        return soldComps.filter((comp) => {
            if (!comp.item_origin_date) {
                return false;
            }

            const originDate = new Date(comp.item_origin_date);

            if (Number.isNaN(originDate.getTime())) {
                return false;
            }

            const ageMs = now.getTime() - originDate.getTime();

            return ageMs >= 0 && ageMs <= windowMs;
        });
    }

    let observationWindowDays = defaultWindowDays;
    let currentSoldComps =
        soldCompsWithinWindow(observationWindowDays);

    if (minimumRequired !== null) {
        for (const windowDays of observationWindows) {
            const candidates = soldCompsWithinWindow(windowDays);

            observationWindowDays = windowDays;
            currentSoldComps = candidates;

            if (candidates.length >= minimumRequired) {
                break;
            }
        }
    }

    const windowExpanded =
        observationWindowDays > defaultWindowDays;

    const soldPrices = currentSoldComps
        .map((comp) =>
            Number.isInteger(comp.total_buyer_cost_cents)
                ? comp.total_buyer_cost_cents
                : comp.price_cents
        )
        .filter((price) => Number.isInteger(price));

    const baselineCents = calculateMedian(soldPrices);

    const evidenceSufficient =
        minimumRequired !== null &&
        soldPrices.length >= minimumRequired;

    const recommendedPriceCents =
        evidenceSufficient
            ? baselineCents
            : null;

    const toleranceCents =
        baselineCents === null
            ? 0
            : Math.max(
                Math.round(
                    baselineCents *
                    BUSINESS_RULES.MARKET_BASELINE
                        .representativeTolerance.percent
                ),
                BUSINESS_RULES.MARKET_BASELINE
                    .representativeTolerance.minimumCents
            );

    const representativePrices =
        baselineCents === null
            ? []
            : soldPrices.filter(
                (price) =>
                    Math.abs(price - baselineCents) <= toleranceCents
            );

    const unusualCount =
        soldPrices.length - representativePrices.length;

    const agreementRatio =
        soldPrices.length === 0
            ? 0
            : representativePrices.length / soldPrices.length;

    const priceAgreement =
        soldPrices.length === 0
            ? "insufficient"
            : agreementRatio >=
                BUSINESS_RULES.MARKET_BASELINE.strongAgreementMinimum
                ? "strong"
                : "weak";

    return {
        baseline_cents: baselineCents,
        confidence: "insufficient",
        sold_observed: soldComps.length,
        sold_used: soldPrices.length,
        active_observed: activeComps.length,
        observation_window_days: observationWindowDays,
        representative_count: representativePrices.length,
        unusual_count: unusualCount,
        agreement_ratio: agreementRatio,
        price_agreement: priceAgreement,
        window_expanded: windowExpanded,
        evidence_sufficient: evidenceSufficient,
        recommended_price_cents: recommendedPriceCents,
    };
}
