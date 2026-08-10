import test from "node:test";
import assert from "node:assert/strict";

import { scoreMarketComp } from "../src/services/market/score.js";

const NOW = new Date("2026-08-10T12:00:00Z");

test("scores comp tiers according to evidence strength", () => {
    const expectedScores = {
        exact: 145,
        same_issue: 115,
        same_player_era: 90,
        category_era: 65,
    };

    for (const [compTier, expectedScore] of Object.entries(expectedScores)) {
        const result = scoreMarketComp(
            {
                comp_id: compTier,
                comp_tier: compTier,
                market_status: "sold",
                item_origin_date: "2026-07-15T12:00:00Z",
            },
            NOW
        );

        assert.equal(result.evidence_score, expectedScore);
    }
});

test("completed sale receives market status evidence bonus", () => {
    const sold = scoreMarketComp(
        {
            comp_id: "SOLD",
            comp_tier: "exact",
            market_status: "sold",
            item_origin_date: null,
        },
        NOW
    );

    const active = scoreMarketComp(
        {
            comp_id: "ACTIVE",
            comp_tier: "exact",
            market_status: "active",
            item_origin_date: null,
        },
        NOW
    );

    assert.equal(sold.evidence_score, 125);
    assert.equal(active.evidence_score, 100);
});

test("freshness evidence decays as market evidence ages", () => {
    const cases = [
        ["2026-07-20T12:00:00Z", 120],
        ["2026-06-01T12:00:00Z", 115],
        ["2026-04-01T12:00:00Z", 110],
        ["2025-12-01T12:00:00Z", 105],
        ["2025-01-01T12:00:00Z", 100],
    ];

    for (const [itemOriginDate, expectedScore] of cases) {
        const result = scoreMarketComp(
            {
                comp_id: itemOriginDate,
                comp_tier: "exact",
                market_status: "active",
                item_origin_date: itemOriginDate,
            },
            NOW
        );

        const freshnessReason = result.evidence_reasons.find(
            (reason) => reason.factor === "freshness"
        );

        if (expectedScore === 100) {
            assert.equal(freshnessReason, undefined);
        } else {
            assert.ok(freshnessReason);
        }
    }
});

test("young active listing receives listing age support", () => {
    const result = scoreMarketComp(
        {
            comp_id: "FRESH_CHAD",
            comp_tier: "exact",
            market_status: "active",
            item_origin_date: "2026-07-20T12:00:00Z",
        },
        NOW
    );

    assert.equal(result.evidence_score, 130);

    assert.deepEqual(
        result.evidence_reasons.find(
            (reason) => reason.factor === "listing_age"
        ),
        {
            factor: "listing_age",
            points: 10,
            reason: "Active listing has been listed for 21 days",
        }
    );
});

test("old active listing receives listing age penalty", () => {
    const result = scoreMarketComp(
        {
            comp_id: "ANCIENT_CHAD",
            comp_tier: "exact",
            market_status: "active",
            item_origin_date: "2025-12-01T12:00:00Z",
        },
        NOW
    );

    assert.equal(result.evidence_score, 95);

    assert.deepEqual(
        result.evidence_reasons.find(
            (reason) => reason.factor === "listing_age"
        ),
        {
            factor: "listing_age",
            points: -10,
            reason: "Active listing has been listed for 252 days",
        }
    );
});
