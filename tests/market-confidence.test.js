import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateMarketConfidence
} from "../src/services/market/confidence.js";

test("returns null confidence when evidence is insufficient", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: false
    });

    assert.deepEqual(result, {
        rating: null,
        label: "Insufficient evidence"
    });
});

test("rates barely sufficient, weak, old evidence as low confidence", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "category_era",
        sold_used: 5,
        agreement_ratio: 0.60,
        price_agreement: "weak",
        observation_window_days: 365,
        window_expanded: true
    });

    assert.deepEqual(result, {
        rating: 1,
        label: "Low"
    });
});

test("rates sufficient but imperfect evidence as guarded confidence", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "same_player_era",
        sold_used: 3,
        agreement_ratio: 0.75,
        price_agreement: "strong",
        observation_window_days: 180,
        window_expanded: true
    });

    assert.deepEqual(result, {
        rating: 2,
        label: "Guarded"
    });
});

test("rates healthy recent evidence as moderate confidence", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "same_player_era",
        sold_used: 4,
        agreement_ratio: 0.80,
        price_agreement: "strong",
        observation_window_days: 90,
        window_expanded: false
    });

    assert.deepEqual(result, {
        rating: 3,
        label: "Moderate"
    });
});

test("rates multiple exact recent sales with strong agreement as high confidence", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "exact",
        sold_used: 3,
        agreement_ratio: 0.90,
        price_agreement: "strong",
        observation_window_days: 90,
        window_expanded: false
    });

    assert.deepEqual(result, {
        rating: 4,
        label: "High"
    });
});

test("rates abundant same-issue recent evidence with exceptional agreement as very high confidence", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "same_issue",
        sold_used: 8,
        agreement_ratio: 0.95,
        price_agreement: "strong",
        observation_window_days: 90,
        window_expanded: false
    });

    assert.deepEqual(result, {
        rating: 5,
        label: "Very High"
    });
});

test("treats exactly 90 percent agreement as high confidence", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "exact",
        sold_used: 3,
        agreement_ratio: 0.90,
        price_agreement: "strong",
        observation_window_days: 90,
        window_expanded: false
    });

    assert.deepEqual(result, {
        rating: 4,
        label: "High"
    });
});

test("does not award very high confidence with seven same-issue sales", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "same_issue",
        sold_used: 7,
        agreement_ratio: 0.95,
        price_agreement: "strong",
        observation_window_days: 90,
        window_expanded: false
    });

    assert.notDeepEqual(result, {
        rating: 5,
        label: "Very High"
    });
});

test("does not award very high confidence below 95 percent agreement", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "same_issue",
        sold_used: 8,
        agreement_ratio: 0.94,
        price_agreement: "strong",
        observation_window_days: 90,
        window_expanded: false
    });

    assert.notDeepEqual(result, {
        rating: 5,
        label: "Very High"
    });
});

test("does not award high confidence with only two exact sales", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "exact",
        sold_used: 2,
        agreement_ratio: 1.00,
        price_agreement: "strong",
        observation_window_days: 90,
        window_expanded: false
    });

    assert.notDeepEqual(result, {
        rating: 4,
        label: "High"
    });
});

test("does not award high confidence to stale exact evidence", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "exact",
        sold_used: 3,
        agreement_ratio: 1.00,
        price_agreement: "strong",
        observation_window_days: 365,
        window_expanded: true
    });

    assert.notDeepEqual(result, {
        rating: 4,
        label: "High"
    });
});

test("does not award very high confidence when same-issue evidence required a wider window", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "same_issue",
        sold_used: 8,
        agreement_ratio: 0.95,
        price_agreement: "strong",
        observation_window_days: 180,
        window_expanded: true
    });

    assert.notDeepEqual(result, {
        rating: 5,
        label: "Very High"
    });
});

test("treats complete coverage of a small exact evidence set as moderate confidence", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "exact",
        eligible_sold_count: 2,
        sold_used: 2,
        agreement_ratio: 1.00,
        price_agreement: "strong",
        observation_window_days: 90,
        window_expanded: false
    });

    assert.equal(result.rating, 3);
    assert.equal(result.label, "Moderate");
});

test("does not assume incomplete price coverage is equivalent to complete coverage", () => {
    const result = calculateMarketConfidence({
        evidence_sufficient: true,
        tier_code: "exact",
        eligible_sold_count: 10,
        sold_used: 2,
        agreement_ratio: 1.00,
        price_agreement: "strong",
        observation_window_days: 90,
        window_expanded: false
    });

    assert.notEqual(result.rating, 3);
});
