import test from "node:test";
import assert from "node:assert/strict";

import {
    calculatePriceDispersion
} from "../src/services/market/dispersion.js";

test("A/B/C: dispersion increases from tight to mild outlier to extreme outlier", () => {
    const caseA = [1200, 1300, 1400, 1500, 1600];
    const caseB = [1200, 1300, 1400, 1500, 1600, 4200];
    const caseC = [1200, 1300, 1400, 1500, 1600, 1800];

    const dispersionA = calculatePriceDispersion(caseA);
    const dispersionB = calculatePriceDispersion(caseB);
    const dispersionC = calculatePriceDispersion(caseC);

    console.table([
        {
            case: "A — tight cluster",
            prices: caseA.join(", "),
            standardDeviation: dispersionA.standard_deviation,
            median: dispersionA.median,
        },
        {
            case: "B — extreme outlier",
            prices: caseB.join(", "),
            standardDeviation: dispersionB.standard_deviation,
            median: dispersionB.median,
        },
        {
            case: "C — mild outlier",
            prices: caseC.join(", "),
            standardDeviation: dispersionC.standard_deviation,
            median: dispersionC.median,
        },
    ]);

    assert.equal(dispersionA.median, 1400);
    assert.equal(dispersionB.median, 1450);
    assert.equal(dispersionC.median, 1450);

    assert.ok(
        dispersionA.standard_deviation <
        dispersionC.standard_deviation
    );

    assert.ok(
        dispersionC.standard_deviation <
        dispersionB.standard_deviation
    );
});
