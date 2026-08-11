import test from "node:test";
import assert from "node:assert/strict";

import {
    classifyMarketCharacter
} from "../src/services/market/character.js";

test("classifies the A/B/C/D market shapes", () => {
    const cases = [
        {
            name: "A — tight",
            evidence: {
                median_cents: 1400,
                agreement_ratio: 1,
                mad_cents: 100,
                standard_deviation_cents: 141.42,
                outlier_pressure: 0,
            },
            expected: "tight",
        },
        {
            name: "C — mild outlier",
            evidence: {
                median_cents: 1450,
                agreement_ratio: 5 / 6,
                mad_cents: 150,
                standard_deviation_cents: 197.2,
                outlier_pressure: 0,
            },
            expected: "mild_outlier",
        },
        {
            name: "D — broad market",
            evidence: {
                median_cents: 1400,
                agreement_ratio: 5 / 6,
                mad_cents: 300,
                standard_deviation_cents: 424.26,
                outlier_pressure: 0,
            },
            expected: "broad",
        },
        {
            name: "B — extreme outlier",
            evidence: {
                median_cents: 1450,
                agreement_ratio: 5 / 6,
                mad_cents: 150,
                standard_deviation_cents: 1051.45,
                outlier_pressure: 0.92,
            },
            expected: "extreme_outlier",
        },
    ];

    const results = cases.map(({ name, evidence, expected }) => {
        const character = classifyMarketCharacter(evidence);

        return {
            case: name,
            character,
            expected,
        };
    });

    console.table(results);

    for (const result of results) {
        assert.equal(result.character, result.expected);
    }
});
