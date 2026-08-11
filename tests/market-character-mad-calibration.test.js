import test from "node:test";

import {
    classifyMarketCharacter
} from "../src/services/market/character.js";

test("calibrates market character across MAD boundaries", () => {
    const madValues = [
        100,
        125,
        150,
        175,
        200,
        225,
        250,
        275,
        300,
    ];

    const results = madValues.map((mad) => {
        const character = classifyMarketCharacter({
            agreement_ratio: 1,
            mad_cents: mad,
            standard_deviation_cents: mad * 1.4142,
            outlier_pressure: 0,
        });

        return {
            madCents: mad,
            dispersionRatio: 1.4142,
            character,
        };
    });

    console.table(results);
});
