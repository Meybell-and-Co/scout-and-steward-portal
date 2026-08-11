import test from "node:test";

import {
    classifyMarketCharacter
} from "../src/services/market/character.js";

test("calibrates market character across relative MAD boundaries", () => {
    const medianCents = 10000;

    const madPercents = [
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        12,
        14,
        16,
        18,
        20,
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
