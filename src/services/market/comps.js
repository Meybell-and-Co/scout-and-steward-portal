import { BUSINESS_RULES } from "../../config/business-rules.js";

const COMP_TIER_ORDER = [
    "exact",
    "same_issue",
    "same_player_era",
    "category_era"
];

function getTierDefinition(tierCode) {
    return Object.values(BUSINESS_RULES.COMP_TIERS).find(
        (tier) => tier.code === tierCode
    );
}

function getMinimumRequirement(tierCode) {
    return BUSINESS_RULES.COMP_MINIMUM_REQUIREMENTS[tierCode];
}

export function selectComparableTier(candidates) {
    if (!Array.isArray(candidates)) {
        throw new Error("candidates must be an array");
    }

    for (const tierCode of COMP_TIER_ORDER) {
        const minimumRequired = getMinimumRequirement(tierCode);

        const matchingCandidates = candidates.filter(
            (candidate) => candidate.comp_tier === tierCode
        );

        if (matchingCandidates.length >= minimumRequired) {
            const tier = getTierDefinition(tierCode);

            return {
                tier_code: tier.code,
                tier_rank: tier.rank,
                tier_label: tier.label,
                evidence_quality:
                    tier.rank === 1
                        ? "strong"
                        : tier.rank === 2
                            ? "good"
                            : tier.rank === 3
                                ? "moderate"
                                : "limited",
                candidates: matchingCandidates
            };
        }
    }

    return {
        tier_code: null,
        tier_rank: null,
        tier_label: null,
        evidence_quality: "insufficient",
        candidates: []
    };
}
