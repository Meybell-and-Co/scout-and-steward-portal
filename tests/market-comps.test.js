import test from "node:test";
import assert from "node:assert/strict";

import { selectComparableTier } from "../src/services/market/comps.js";

test("selects exact comps when minimum evidence is met", () => {
    const result = selectComparableTier([
        { comp_tier: "exact", id: "A" },
        { comp_tier: "same_issue", id: "B" }
    ]);

    assert.equal(result.tier_code, "exact");
    assert.equal(result.evidence_quality, "strong");
    assert.equal(result.candidates.length, 1);
});

test("falls back to same issue when exact evidence is insufficient", () => {
    const result = selectComparableTier([
        { comp_tier: "same_issue", id: "A" },
        { comp_tier: "same_issue", id: "B" }
    ]);

    assert.equal(result.tier_code, "same_issue");
    assert.equal(result.evidence_quality, "good");
    assert.equal(result.candidates.length, 2);
});

test("falls back to same player era", () => {
    const result = selectComparableTier([
        { comp_tier: "same_player_era", id: "A" },
        { comp_tier: "same_player_era", id: "B" },
        { comp_tier: "same_player_era", id: "C" }
    ]);

    assert.equal(result.tier_code, "same_player_era");
    assert.equal(result.evidence_quality, "moderate");
    assert.equal(result.candidates.length, 3);
});

test("falls back to category era", () => {
    const result = selectComparableTier([
        { comp_tier: "category_era", id: "A" },
        { comp_tier: "category_era", id: "B" },
        { comp_tier: "category_era", id: "C" },
        { comp_tier: "category_era", id: "D" },
        { comp_tier: "category_era", id: "E" }
    ]);

    assert.equal(result.tier_code, "category_era");
    assert.equal(result.evidence_quality, "limited");
    assert.equal(result.candidates.length, 5);
});

test("reports insufficient evidence when no tier meets its minimum", () => {
    const result = selectComparableTier([
        { comp_tier: "same_issue", id: "A" },
        { comp_tier: "same_player_era", id: "B" },
        { comp_tier: "same_player_era", id: "C" },
        { comp_tier: "category_era", id: "D" },
        { comp_tier: "category_era", id: "E" },
        { comp_tier: "category_era", id: "F" },
        { comp_tier: "category_era", id: "G" }
    ]);

    assert.equal(result.tier_code, null);
    assert.equal(result.evidence_quality, "insufficient");
    assert.equal(result.candidates.length, 0);
});
