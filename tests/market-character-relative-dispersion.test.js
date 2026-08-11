import test from "node:test";

import {
    classifyMarketCharacter
} from "../src/services/market/character.js";

test("calibrates market character across price scales", () => {
    const cases = [
        { median: 1200, mad: 100 },
        { median: 2500, mad: 200 },
        { median: 5000, mad: 400 },
        { median: 10000, mad: 800 },
        { median: 25000, mad: 2000 },
        { median: 50000, mad: 4000 },
        { median: 100000, mad: 8000 },
        { median: 145000, mad: 11600 },
    ];

    const results = cases.map(({ median, mad }) => {
        const dispersionRatio = 1.4142;

        const character = classifyMarketCharacter({
            agreement_ratio: 1,
            mad_cents: mad,
            standard_deviation_cents: mad * dispersionRatio,
            outlier_pressure: 0,
        });

        return {
            medianCents: median,
            madCents: mad,
            madPercent: Number(((mad / median) * 100).toFixed(1)),
            character,
        };
    });

    console.table(results);
});
