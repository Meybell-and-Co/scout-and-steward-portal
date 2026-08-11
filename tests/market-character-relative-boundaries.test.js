import test from "node:test";
import assert from "node:assert/strict";

import {
    classifyMarketCharacter
} from "../src/services/market/character.js";

test("classifies market breadth using relative MAD boundaries", () => {
    const medianCents = 10000;

    const cases = [
        { madPercent: 7, expected: "tight" },
        { madPercent: 8, expected: "tight" },
        { madPercent: 9, expected: "mild_outlier" },
        { madPercent: 10, expected: "mild_outlier" },
        { madPercent: 12, expected: "mild_outlier" },
        { madPercent: 15, expected: "mild_outlier" },
        { madPercent: 18, expected: "mild_outlier" },
        { madPercent: 20, expected: "broad" },
        { madPercent: 22, expected: "broad" },
    ];

    const results = cases.map(({ madPercent, expected }) => {
        const madCents = medianCents * (madPercent / 100);

        const character = classifyMarketCharacter({
            median_cents: medianCents,
            agreement_ratio: 1,
            mad_cents: madCents,
            standard_deviation_cents: madCents * 1.4142,
            outlier_pressure: 0,
        });

        return {
            madPercent,
            character,
            expected,
        };
    });

    console.table(results);

    for (const result of results) {
        assert.equal(result.character, result.expected);
    }
});
