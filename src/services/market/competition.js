import { BUSINESS_RULES } from "../../config/business-rules.js";
/**
 * Observes comparable market competition for a selected tier.
 *
 * Active listings describe current supply and competition.
 * Sold listings describe demonstrated market activity.
 */
export function assessMarketCompetition(
    comps,
    now = new Date(),
    tierCode = null
) {
    if (!Array.isArray(comps)) {
        throw new Error("comps must be an array");
    }

    const tierComps = tierCode
        ? comps.filter((comp) => comp.comp_tier === tierCode)
        : comps;

    const activeComps = tierComps.filter(
        (comp) => comp.market_status === "active"
    );

    const soldComps = tierComps.filter(
        (comp) => comp.market_status === "sold"
    );

    let freshActiveCount = 0;
    let agingActiveCount = 0;
    let staleActiveCount = 0;

    for (const comp of activeComps) {
        if (!comp.item_origin_date) {
            continue;
        }

        const originDate = new Date(comp.item_origin_date);

        if (Number.isNaN(originDate.getTime())) {
            continue;
        }

        const ageMs = now.getTime() - originDate.getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);

        if (ageDays < 0) {
            continue;
        }

        if (ageDays <= 30) {
            freshActiveCount += 1;
        } else if (ageDays <= 180) {
            agingActiveCount += 1;
        } else {
            staleActiveCount += 1;
        }
    }

    const activeToSoldRatio =
        soldComps.length > 0
            ? activeComps.length / soldComps.length
            : null;

    let marketActivityScore = null;
    let marketActivityLabel = "Insufficient market activity evidence";

    const neutralRatio =
        BUSINESS_RULES.MARKET_ACTIVITY.neutralActiveToSoldRatio;

    if (
        activeToSoldRatio !== null &&
        activeToSoldRatio <=
        BUSINESS_RULES.MARKET_ACTIVITY.healthyActivityMaxActiveToSoldRatio
    ) {
        marketActivityScore = 1;
        marketActivityLabel = "Healthy activity";
    } else if (
        activeToSoldRatio !== null &&
        activeToSoldRatio >= neutralRatio.min &&
        activeToSoldRatio <= neutralRatio.max
    ) {
        marketActivityScore = 0;
        marketActivityLabel = "Normal market activity";
    } else if (
        activeToSoldRatio !== null &&
        activeToSoldRatio >
        BUSINESS_RULES.MARKET_ACTIVITY.softActivityMinActiveToSoldRatio &&
        activeToSoldRatio <=
        BUSINESS_RULES.MARKET_ACTIVITY.softActivityMaxActiveToSoldRatio
    ) {
        marketActivityScore = -1;
        marketActivityLabel = "Slightly soft activity";
    }

    const staleSupplyRatio =
        activeComps.length > 0
            ? staleActiveCount / activeComps.length
            : 0;

    if (
        marketActivityScore === 0 &&
        staleSupplyRatio >=
        BUSINESS_RULES.MARKET_ACTIVITY.staleSupplySoftActivityMinimum
    ) {
        marketActivityScore = -1;
        marketActivityLabel = "Slightly soft activity";
    } else if (
        activeToSoldRatio !== null &&
        activeToSoldRatio >
        BUSINESS_RULES.MARKET_ACTIVITY.strongSoftActivityMinActiveToSoldRatio
    ) {
        marketActivityScore = -2;
        marketActivityLabel = "Strong downward pressure";
    }

    return {
        active_observed: activeComps.length,
        sold_observed: soldComps.length,
        fresh_active_count: freshActiveCount,
        aging_active_count: agingActiveCount,
        stale_active_count: staleActiveCount,
        active_to_sold_ratio: activeToSoldRatio,
        market_activity_score: marketActivityScore,
        market_activity_label: marketActivityLabel
    };
}
