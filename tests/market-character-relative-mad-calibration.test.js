import test from "node:test";

import {
    classifyMarketCharacter
} from "../src/services/market/character.js";

test("calibrates market character across relative MAD", () => {
    const medianCents = 10000;

    const madPercents = [
        1,
        2,
        3,
        4,
        5,
        6,
        8,
        10,
        12,
        15,
        20,
        25,
        30,
    ];

    const results = madPercents.map((madPercent) => {
        const madCents = medianCents * (madPercent / 100);

        const character = classifyMarketCharacter({
            agreement_ratio: 1,
            mad_cents: madCents,
            standard_deviation_cents: madCents * 1.4142,
            outlier_pressure: 0,
        });

        return {
            madPercent,
            madCents,
            character,
        };
    });

    console.table(results);
});
