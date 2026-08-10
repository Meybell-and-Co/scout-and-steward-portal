export const BUSINESS_RULES = {
    SHIPPING_ALLOWANCE_CENTS: 1000,
    MIN_ADJUSTED_MARKET_VALUE_CENTS: 0,

    PRICING_FACTOR_WEIGHTS: {
        condition: 0.30,
        player_significance: 0.15,
        scarcity: 0.20,
        market_activity: 0.25
    },

    PRICING_STRENGTH_RANGE: {
        min: -3,
        max: 3
    },

    COMP_TIERS: {
        EXACT: {
            code: "exact",
            rank: 1,
            label: "Exact card",
            description: "Same player, year, set, and card number"
        },

        SAME_ISSUE: {
            code: "same_issue",
            rank: 2,
            label: "Same issue",
            description: "Same year, set, and classification with a comparable subject"
        },

        SAME_PLAYER_ERA: {
            code: "same_player_era",
            rank: 3,
            label: "Same player / era",
            description: "Same player with broadly comparable cards from the same era"
        },

        CATEGORY_ERA: {
            code: "category_era",
            rank: 4,
            label: "Category / era",
            description: "Similar sport, card category, and era"
        }
    },

    COMP_MINIMUM_REQUIREMENTS: {
        exact: 1,
        same_issue: 2,
        same_player_era: 3,
        category_era: 5
    },

    PRICING_FACTOR_RUBRICS: {
        condition: {
            label: "Condition",
            scores: {
                "-3": "Major structural damage",
                "-2": "Significant visible wear",
                "-1": "Mild visible wear",
                "0": "No meaningful condition pressure identified",
                "1": "Unusually strong condition",
                "2": "Exceptional condition",
                "3": "Extraordinary condition"
            }
        },

        player_significance: {
            label: "Player & Significance",
            scores: {
                "-3": "Very limited collector significance",
                "-2": "Below-average collector significance",
                "-1": "Somewhat limited collector significance",
                "0": "Ordinary collector significance",
                "1": "Recognizable or historically interesting player",
                "2": "Strong collector significance",
                "3": "Major hobby or historical significance"
            }
        },

        scarcity: {
            label: "Scarcity",
            scores: {
                "-3": "Abundant supply",
                "-2": "Readily available",
                "-1": "Somewhat common",
                "0": "No meaningful scarcity signal",
                "1": "Somewhat scarce",
                "2": "Clearly scarce",
                "3": "Strong evidence of genuine scarcity"
            }
        },

        market_activity: {
            label: "Market Activity",
            scores: {
                "-3": "Very weak activity or substantial competition",
                "-2": "Weak activity or meaningful competition",
                "-1": "Slightly soft activity",
                "0": "Normal market activity",
                "1": "Healthy activity",
                "2": "Strong activity",
                "3": "Exceptionally strong buyer activity"
            }
        }
    }
};
