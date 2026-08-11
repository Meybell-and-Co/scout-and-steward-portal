import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateOutlierPressure
} from "../src/services/market/outlier-pressure.js";

test("calibrates outlier pressure across market shapes", () => {
    const cases = [
        { name: "A — tight", sd: 141.42, mad: 100 },
        { name: "C — mild outlier", sd: 197.20, mad: 150 },
        { name: "D — broad market", sd: 424.26, mad: 300 },
        { name: "B — extreme outlier", sd: 1051.45, mad: 150 },
    ];

    const results = cases.map((item) => ({
        case: item.name,
        ratio: Number((item.sd / item.mad).toFixed(2)),
        outlierPressure: Number(
            calculateOutlierPressure(item.sd, item.mad).toFixed(3)
        ),
    }));

    console.table(results);

    assert.ok(results[0].outlierPressure < 0.01);
    assert.ok(results[1].outlierPressure < 0.01);
    assert.ok(results[2].outlierPressure < 0.01);
    assert.ok(results[3].outlierPressure > 0.9);
});
