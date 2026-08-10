import test from "node:test";
import assert from "node:assert/strict";

import { calculateMarketBaseline } from "../src/services/market/baseline.js";

const TEST_NOW = new Date("2026-08-10T12:00:00Z");
const RECENT_SOLD_DATE = "2026-08-01T12:00:00Z";

test("separates sold comps from active listings", () => {
    const comps = [
        {
            market_status: "sold",
            price_cents: 1200,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 1400,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "active",
            price_cents: 2500
        },
        {
            market_status: "active",
            price_cents: 3000
        },
        {
            market_status: "active",
            price_cents: 4000
        }
    ];

    const result = calculateMarketBaseline(comps, TEST_NOW);

    assert.equal(result.sold_observed, 2);
    assert.equal(result.active_observed, 3);
    assert.equal(result.baseline_cents, 1300);
    assert.equal(result.sold_used, 2);
    assert.equal(result.confidence, "insufficient");
});

test("calculates the median price from sold comps only", () => {
    const comps = [
        {
            market_status: "sold",
            price_cents: 1200,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 1400,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 7900,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "active",
            price_cents: 2500
        }
    ];

    const result = calculateMarketBaseline(comps, TEST_NOW);

    assert.equal(result.baseline_cents, 1400);
    assert.equal(result.sold_used, 3);
});

test("identifies sold prices inside the representative tolerance", () => {
    const comps = [
        {
            market_status: "sold",
            price_cents: 1200,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 1300,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 1400,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 1500,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 1600,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 4200,
            item_origin_date: RECENT_SOLD_DATE
        }
    ];

    const result = calculateMarketBaseline(comps, TEST_NOW);

    assert.equal(result.baseline_cents, 1450);
    assert.equal(result.representative_count, 5);
    assert.equal(result.unusual_count, 1);
    assert.equal(result.agreement_ratio, 5 / 6);
});

test("uses the minimum two-dollar tolerance for low-value cards", () => {
    const comps = [
        {
            market_status: "sold",
            price_cents: 300,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 400,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 500,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 600,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 1200,
            item_origin_date: RECENT_SOLD_DATE
        }
    ];

    const result = calculateMarketBaseline(comps, TEST_NOW);

    assert.equal(result.baseline_cents, 500);
    assert.equal(result.representative_count, 4);
    assert.equal(result.unusual_count, 1);
    assert.equal(result.agreement_ratio, 4 / 5);
});

test("reports strong agreement when at least 75 percent of sold evidence is representative", () => {
    const comps = [
        {
            market_status: "sold",
            price_cents: 1200,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 1300,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 1400,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 1500,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 1600,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: 4200,
            item_origin_date: RECENT_SOLD_DATE
        }
    ];

    const result = calculateMarketBaseline(comps, TEST_NOW);

    assert.equal(result.price_agreement, "strong");
    assert.equal(result.confidence, "insufficient");
});

test("ignores sold comps without a valid integer price", () => {
    const comps = [
        {
            market_status: "sold",
            price_cents: 1200,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: null,
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "sold",
            price_cents: "1400",
            item_origin_date: RECENT_SOLD_DATE
        },
        {
            market_status: "active",
            price_cents: 9000
        }
    ];

    const result = calculateMarketBaseline(comps, TEST_NOW);

    assert.equal(result.sold_observed, 4);
    assert.equal(result.sold_used, 1);
    assert.equal(result.baseline_cents, 1200);
    assert.equal(result.active_observed, 1);
    assert.equal(result.confidence, "insufficient");
});

test("uses sold evidence from the default 90-day observation window", () => {
    const comps = [
        {
            market_status: "sold",
            price_cents: 1200,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            price_cents: 1400,
            item_origin_date: "2026-06-15T12:00:00Z"
        },
        {
            market_status: "sold",
            price_cents: 9000,
            item_origin_date: "2026-04-01T12:00:00Z"
        }
    ];

    const result = calculateMarketBaseline(comps, TEST_NOW);

    assert.equal(result.sold_observed, 3);
    assert.equal(result.sold_used, 2);
    assert.equal(result.baseline_cents, 1300);
    assert.equal(result.observation_window_days, 90);
});
test("widens from 90 to 180 days when the selected tier needs more sold evidence", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1200,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1400,
            item_origin_date: "2026-04-15T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 9000,
            item_origin_date: "2025-01-01T12:00:00Z"
        }
    ];

    const result = calculateMarketBaseline(
        comps,
        TEST_NOW,
        "same_issue"
    );

    assert.equal(result.sold_observed, 3);
    assert.equal(result.sold_used, 2);
    assert.equal(result.baseline_cents, 1300);
    assert.equal(result.observation_window_days, 180);
    assert.equal(result.window_expanded, true);
});
test("does not widen beyond 90 days when the selected tier already has enough evidence", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1200,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1400,
            item_origin_date: "2026-07-15T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 9000,
            item_origin_date: "2026-04-15T12:00:00Z"
        }
    ];

    const result = calculateMarketBaseline(
        comps,
        TEST_NOW,
        "same_issue"
    );

    assert.equal(result.sold_observed, 3);
    assert.equal(result.sold_used, 2);
    assert.equal(result.baseline_cents, 1300);
    assert.equal(result.observation_window_days, 90);
    assert.equal(result.window_expanded, false);
});
test("stops at 365 days when the selected tier still lacks enough sold evidence", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1200,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1400,
            item_origin_date: "2026-01-15T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 9000,
            item_origin_date: "2025-01-15T12:00:00Z"
        }
    ];

    const result = calculateMarketBaseline(
        comps,
        TEST_NOW,
        "same_issue"
    );

    assert.equal(result.sold_observed, 3);
    assert.equal(result.sold_used, 2);
    assert.equal(result.baseline_cents, 1300);
    assert.equal(result.observation_window_days, 365);
    assert.equal(result.window_expanded, true);
    assert.equal(result.confidence, "insufficient");
});
test("reports insufficient evidence when 365 days still cannot meet the selected tier minimum", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "same_player_era",
            price_cents: 1200,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_player_era",
            price_cents: 1400,
            item_origin_date: "2026-01-15T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_player_era",
            price_cents: 9000,
            item_origin_date: "2025-01-15T12:00:00Z"
        }
    ];

    const result = calculateMarketBaseline(
        comps,
        TEST_NOW,
        "same_player_era"
    );

    assert.equal(result.sold_observed, 3);
    assert.equal(result.sold_used, 2);
    assert.equal(result.observation_window_days, 365);
    assert.equal(result.window_expanded, true);
    assert.equal(result.confidence, "insufficient");
});
test("does not recommend a price when the selected tier lacks sufficient evidence", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "same_player_era",
            price_cents: 1200,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_player_era",
            price_cents: 1400,
            item_origin_date: "2026-01-15T12:00:00Z"
        }
    ];

    const result = calculateMarketBaseline(
        comps,
        TEST_NOW,
        "same_player_era"
    );

    assert.equal(result.baseline_cents, 1300);
    assert.equal(result.evidence_sufficient, false);
    assert.equal(result.recommended_price_cents, null);
});
test("recommends the market baseline when the selected tier has sufficient evidence", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1200,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1400,
            item_origin_date: "2026-07-15T12:00:00Z"
        }
    ];

    const result = calculateMarketBaseline(
        comps,
        TEST_NOW,
        "same_issue"
    );

    assert.equal(result.evidence_sufficient, true);
    assert.equal(result.baseline_cents, 1300);
    assert.equal(result.recommended_price_cents, 1300);
    assert.equal(result.observation_window_days, 90);
});
test("uses total buyer cost including shipping when calculating the market baseline", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1000,
            shipping_cents: 500,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "same_issue",
            price_cents: 1400,
            shipping_cents: 100,
            total_buyer_cost_cents: 1500,
            item_origin_date: "2026-07-15T12:00:00Z"
        }
    ];

    const result = calculateMarketBaseline(
        comps,
        TEST_NOW,
        "same_issue"
    );

    assert.equal(result.sold_used, 2);
    assert.equal(result.baseline_cents, 1500);
    assert.equal(result.recommended_price_cents, 1500);
});
