import test from "node:test";

import {
    calculateOutlierPressure
} from "../src/services/market/outlier-pressure.js";

test("calibrates outlier pressure across dispersion ratios", () => {
    const ratios = [
        1.2,
        1.4,
        1.6,
        1.8,
        2.0,
        2.5,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
    ];

    const results = ratios.map((ratio) => ({
        ratio,
        outlierPressure: Number(
            calculateOutlierPressure(ratio, 1).toFixed(3)
        ),
    }));

    console.table(results);
});
