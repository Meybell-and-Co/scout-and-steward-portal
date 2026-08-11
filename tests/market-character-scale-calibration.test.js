import test from "node:test";
import assert from "node:assert/strict";

import {
    classifyMarketCharacter
} from "../src/services/market/character.js";

test("calibrates market character consistently across price scales", () => {
    const medians = [
        1000,
        2500,
        10000,
        50000,
        150000,
    ];

    const madPercents = [
        2,
        5,
        8,
        10,
        15,
        20,
        25,
    ];

    const results = [];

    for (const medianCents of medians) {
        for (const madPercent of madPercents) {
            const madCents = medianCents * (madPercent / 100);

            const character = classifyMarketCharacter({
                median_cents: medianCents,
                agreement_ratio: 1,
                mad_cents: madCents,
                standard_deviation_cents: madCents * 1.4142,
                outlier_pressure: 0,
            });

            results.push({
                medianCents,
                madPercent,
                madCents: Math.round(madCents),
                character,
            });
        }
    }

    console.table(results);

    for (const madPercent of madPercents) {
        const characters = results
            .filter((result) => result.madPercent === madPercent)
            .map((result) => result.character);

        assert.ok(
            characters.every((character) => character === characters[0]),
            `character should remain consistent at ${madPercent}% relative MAD`
        );
    }
});
