import test from "node:test";

import {
    classifyMarketCharacter
} from "../src/services/market/character.js";

test("calibrates market character across SD-to-MAD ratios", () => {
    const medianCents = 10000;
    const madCents = 1000;

    const ratios = [
        1.0,
        1.2,
        1.4,
        1.6,
        2.0,
        2.5,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
    ];

    const results = ratios.map((ratio) => {
        const character = classifyMarketCharacter({
            median_cents: medianCents,
            agreement_ratio: 1,
            mad_cents: madCents,
            standard_deviation_cents: madCents * ratio,
            outlier_pressure: 0,
        });

        return {
            ratio,
            character,
        };
    });

    console.table(results);
});
