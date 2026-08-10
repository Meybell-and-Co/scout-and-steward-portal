import test from "node:test";
import assert from "node:assert/strict";

import {
    assessMarketCompetition
} from "../src/services/market/competition.js";

const TEST_NOW = new Date("2026-08-10T12:00:00Z");

test("counts active comparable listings without treating them as sold evidence", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "exact",
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            item_origin_date: "2026-08-05T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            item_origin_date: "2026-07-20T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "same_issue",
            item_origin_date: "2026-07-15T12:00:00Z"
        }
    ];

    const result = assessMarketCompetition(
        comps,
        TEST_NOW,
        "exact"
    );

    assert.equal(result.active_observed, 2);
    assert.equal(result.sold_observed, 1);
});
test("classifies active comparable listings by listing age", () => {
    const comps = [
        {
            market_status: "active",
            comp_tier: "exact",
            item_origin_date: "2026-08-05T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            item_origin_date: "2026-07-01T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            item_origin_date: "2026-01-01T12:00:00Z"
        }
    ];

    const result = assessMarketCompetition(
        comps,
        TEST_NOW,
        "exact"
    );

    assert.equal(result.fresh_active_count, 1);
    assert.equal(result.aging_active_count, 1);
    assert.equal(result.stale_active_count, 1);
});
test("reports the ratio of active supply to observed sales", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        }
    ];

    const result = assessMarketCompetition(
        comps,
        TEST_NOW,
        "exact"
    );

    assert.equal(result.active_to_sold_ratio, 2);
});
test("reports no active-to-sold ratio when no sales are observed", () => {
    const comps = [
        {
            market_status: "active",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        }
    ];

    const result = assessMarketCompetition(
        comps,
        TEST_NOW,
        "exact"
    );

    assert.equal(result.active_observed, 2);
    assert.equal(result.sold_observed, 0);
    assert.equal(result.active_to_sold_ratio, null);
});
test("reports neutral market activity when active supply and observed sales are balanced", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "exact",
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "sold",
            comp_tier: "exact",
            item_origin_date: "2026-07-25T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            item_origin_date: "2026-08-05T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            item_origin_date: "2026-07-20T12:00:00Z"
        }
    ];

    const result = assessMarketCompetition(
        comps,
        TEST_NOW,
        "exact"
    );

    assert.equal(result.market_activity_score, 0);
    assert.equal(result.market_activity_label, "Normal market activity");
});
test("treats approximately balanced supply and sales as normal market activity", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        }
    ];

    const result = assessMarketCompetition(
        comps,
        TEST_NOW,
        "exact"
    );

    assert.equal(result.active_to_sold_ratio, 2 / 3);
    assert.equal(result.market_activity_score, 0);
    assert.equal(
        result.market_activity_label,
        "Normal market activity"
    );
});
test("reports healthy market activity when sales modestly outpace active supply", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        }
    ];

    const result = assessMarketCompetition(
        comps,
        TEST_NOW,
        "exact"
    );

    assert.equal(result.active_to_sold_ratio, 0.5);
    assert.equal(result.market_activity_score, 1);
    assert.equal(
        result.market_activity_label,
        "Healthy activity"
    );
});
test("reports slightly soft market activity when active supply modestly exceeds sales", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact"
        }
    ];

    const result = assessMarketCompetition(
        comps,
        TEST_NOW,
        "exact"
    );

    assert.equal(result.active_to_sold_ratio, 4 / 3);
    assert.equal(result.market_activity_score, -1);
    assert.equal(
        result.market_activity_label,
        "Slightly soft activity"
    );
});
test("reports slightly soft activity when neutral supply is mostly stale", () => {
    const comps = [
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "sold",
            comp_tier: "exact"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            item_origin_date: "2026-08-01T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            item_origin_date: "2026-07-01T12:00:00Z"
        },
        {
            market_status: "active",
            comp_tier: "exact",
            item_origin_date: "2026-01-01T12:00:00Z"
        }
    ];

    const result = assessMarketCompetition(
        comps,
        TEST_NOW,
        "exact"
    );

    assert.equal(result.active_to_sold_ratio, 1);
    assert.equal(result.fresh_active_count, 1);
    assert.equal(result.aging_active_count, 1);
    assert.equal(result.stale_active_count, 1);

    assert.equal(result.market_activity_score, -1);
    assert.equal(
        result.market_activity_label,
        "Slightly soft activity"
    );
});
