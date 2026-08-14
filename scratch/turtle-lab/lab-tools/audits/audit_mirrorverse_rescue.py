from pathlib import Path
import csv
import sys

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[2]

sys.path.insert(
    0,
    str(ROOT / "2up")
)

from test_autocrop_2up import detect_best_candidates


SOURCE = Path(
    r"C:\Users\Meybells\Downloads\incoming-assets\inventory-photos\s-and-s-sports-memorabilia\4UP\oriented"
)

MANIFEST = (
    ROOT /
    "production-rotation-manifest.csv"
)

FAILURES = {
    "UD_001_C_056",
    "UD_001_C_058",
    "UD_001_C_060",
    "UD_001_C_061",
    "UD_001_C_084",
    "UD_001_G_097",
    "UD_002_A_0101",
    "UD_002_B_0002",
    "UD_002_B_0003",
    "UD_002_B_0006_01",
    "UD_002_B_0006_02",
    "UD_002_B_0006_03",
    "UD_002_B_0006_04",
}


SLOTS = (
    "TOP-LEFT",
    "TOP-RIGHT",
    "BOTTOM-LEFT",
    "BOTTOM-RIGHT",
)


def rotate_cw(image, degrees):

    degrees %= 360

    if degrees == 0:
        return image.copy()

    if degrees == 90:
        return cv2.rotate(
            image,
            cv2.ROTATE_90_CLOCKWISE
        )

    if degrees == 180:
        return cv2.rotate(
            image,
            cv2.ROTATE_180
        )

    if degrees == 270:
        return cv2.rotate(
            image,
            cv2.ROTATE_90_COUNTERCLOCKWISE
        )

    raise ValueError(
        f"Unsupported rotation: {degrees}"
    )


def center_of(box):

    return np.mean(
        np.asarray(
            box,
            dtype=np.float32
        ),
        axis=0
    )


def normalized_center(
    image,
    box
):

    height, width = image.shape[:2]

    cx, cy = center_of(
        box
    )

    return (
        float(cx / width),
        float(cy / height),
    )


def slot_for(
    image,
    box
):

    cx, cy = normalized_center(
        image,
        box
    )

    vertical = (
        "TOP"
        if cy < 0.5
        else "BOTTOM"
    )

    horizontal = (
        "LEFT"
        if cx < 0.5
        else "RIGHT"
    )

    return (
        f"{vertical}-{horizontal}"
    )


def candidates_by_slot(
    image,
    candidates
):

    result = {}

    for candidate in candidates:

        slot = slot_for(
            image,
            candidate[1]
        )

        # If two candidates somehow claim the
        # same quadrant, that is not trustworthy.
        if slot in result:
            return None

        result[slot] = candidate

    return result


def normalized_box(
    image,
    box
):

    height, width = image.shape[:2]

    normalized = np.asarray(
        box,
        dtype=np.float32
    ).copy()

    normalized[:, 0] /= width
    normalized[:, 1] /= height

    return normalized


def box_dimensions(
    image,
    box
):

    normalized = normalized_box(
        image,
        box
    )

    rect = cv2.minAreaRect(
        normalized
    )

    width, height = rect[1]

    return (
        max(width, height),
        min(width, height),
    )


def center_distance(
    image_a,
    box_a,
    image_b,
    box_b
):

    a = np.asarray(
        normalized_center(
            image_a,
            box_a
        )
    )

    b = np.asarray(
        normalized_center(
            image_b,
            box_b
        )
    )

    return float(
        np.linalg.norm(
            a - b
        )
    )


def dimension_difference(
    image_a,
    box_a,
    image_b,
    box_b
):

    a_long, a_short = box_dimensions(
        image_a,
        box_a
    )

    b_long, b_short = box_dimensions(
        image_b,
        box_b
    )

    long_delta = abs(
        a_long - b_long
    )

    short_delta = abs(
        a_short - b_short
    )

    return (
        long_delta,
        short_delta,
    )


if not MANIFEST.exists():
    raise RuntimeError(
        f"STOP: Manifest not found: {MANIFEST}"
    )

if not SOURCE.exists():
    raise RuntimeError(
        f"STOP: Source not found: {SOURCE}"
    )


with MANIFEST.open(
    "r",
    newline="",
    encoding="utf-8"
) as handle:

    rows = list(
        csv.DictReader(
            handle
        )
    )


rows = [
    row
    for row in rows
    if row["SourceLayout"] in FAILURES
]


if not rows:
    raise RuntimeError(
        "STOP: No failure rows found in manifest."
    )


layouts_found = {
    row["SourceLayout"]
    for row in rows
}

missing_layouts = (
    FAILURES -
    layouts_found
)

if missing_layouts:
    raise RuntimeError(
        "STOP: Missing manifest layouts: "
        + ", ".join(
            sorted(
                missing_layouts
            )
        )
    )


print()
print("MIRRORVERSE TURTLE AUDITION")
print("---------------------------")
print(
    f"Layouts:       "
    f"{len(layouts_found)}"
)
print(
    f"A/B pairs:     "
    f"{len(rows)}"
)
print()


layout_results = {}


for row in rows:

    layout = row[
        "SourceLayout"
    ]

    pair_key = row[
        "PairKey"
    ]

    a_path = (
        SOURCE /
        row["AFile"]
    )

    b_path = (
        SOURCE /
        row["BFile"]
    )

    if not a_path.exists():
        raise FileNotFoundError(
            f"Missing A: {a_path}"
        )

    if not b_path.exists():
        raise FileNotFoundError(
            f"Missing B: {b_path}"
        )

    a_raw = cv2.imread(
        str(a_path)
    )

    b_raw = cv2.imread(
        str(b_path)
    )

    if (
        a_raw is None
        or b_raw is None
    ):
        raise RuntimeError(
            f"Unable to read pair: {pair_key}"
        )

    a = rotate_cw(
        a_raw,
        int(
            row["ARotateCW"]
        )
    )

    b_rotated = rotate_cw(
        b_raw,
        int(
            row["BRotateCW"]
        )
    )

    # COMPARISON ONLY.
    #
    # Bring Wario into Mario's coordinate sense.
    # No pixels from this image will ever be used
    # to construct or repair A.
    b_mirrorverse = cv2.flip(
        b_rotated,
        1
    )

    (
        _,
        a_candidates,
        a_pass,
        _,
    ) = detect_best_candidates(
        a
    )

    (
        _,
        b_candidates,
        b_pass,
        _,
    ) = detect_best_candidates(
        b_mirrorverse
    )

    a_slots = candidates_by_slot(
        a,
        a_candidates
    )

    b_slots = candidates_by_slot(
        b_mirrorverse,
        b_candidates
    )

    result = {
        "pair": pair_key,
        "a_count": len(
            a_candidates
        ),
        "b_count": len(
            b_candidates
        ),
        "a_pass": a_pass,
        "b_pass": b_pass,
        "missing": None,
        "mirror_found": False,
        "witnesses": [],
    }

    if (
        a_slots is not None
        and len(a_slots) == 3
    ):

        missing = [
            slot
            for slot in SLOTS
            if slot not in a_slots
        ]

        if len(missing) == 1:

            missing_slot = missing[0]

            result[
                "missing"
            ] = missing_slot

            if (
                b_slots is not None
                and missing_slot in b_slots
            ):
                result[
                    "mirror_found"
                ] = True

                mirror_box = (
                    b_slots[
                        missing_slot
                    ][1]
                )

                # Compare the three cards that BOTH
                # universes can see. This tells us how
                # well their normalized geometry agrees.
                for slot in SLOTS:

                    if (
                        slot in a_slots
                        and slot in b_slots
                    ):

                        a_box = (
                            a_slots[
                                slot
                            ][1]
                        )

                        b_box = (
                            b_slots[
                                slot
                            ][1]
                        )

                        center_delta = (
                            center_distance(
                                a,
                                a_box,
                                b_mirrorverse,
                                b_box
                            )
                        )

                        (
                            long_delta,
                            short_delta,
                        ) = dimension_difference(
                            a,
                            a_box,
                            b_mirrorverse,
                            b_box
                        )

                        result[
                            "witnesses"
                        ].append({
                            "slot": slot,
                            "center_delta": (
                                center_delta
                            ),
                            "long_delta": (
                                long_delta
                            ),
                            "short_delta": (
                                short_delta
                            ),
                        })

    layout_results.setdefault(
        layout,
        []
    ).append(
        result
    )


for layout in sorted(
    layout_results
):

    results = layout_results[
        layout
    ]

    print(layout)
    print(
        "-" * len(layout)
    )

    mirror_hits = 0
    agreement_values = []

    missing_slots = []

    for result in results:

        if result["missing"]:
            missing_slots.append(
                result["missing"]
            )

        if result["mirror_found"]:
            mirror_hits += 1

        witness_centers = [
            witness[
                "center_delta"
            ]
            for witness
            in result["witnesses"]
        ]

        if witness_centers:
            median_center = float(
                np.median(
                    witness_centers
                )
            )

            agreement_values.append(
                median_center
            )

            agreement_text = (
                f"{median_center:.4f}"
            )

        else:
            agreement_text = "n/a"

        print(
            f"  {result['pair']}: "
            f"A={result['a_count']}/4 "
            f"[{result['a_pass']}] "
            f"B={result['b_count']}/4 "
            f"[{result['b_pass']}] "
            f"missing="
            f"{result['missing'] or 'UNKNOWN'} "
            f"mirror="
            f"{'YES' if result['mirror_found'] else 'NO'} "
            f"siblingΔ="
            f"{agreement_text}"
        )

    unique_missing = sorted(
        set(
            slot
            for slot in missing_slots
            if slot
        )
    )

    if agreement_values:
        layout_agreement = float(
            np.median(
                agreement_values
            )
        )
    else:
        layout_agreement = None

    print()

    print(
        f"  Mirror hits:   "
        f"{mirror_hits}/"
        f"{len(results)}"
    )

    print(
        f"  Missing slot:  "
        + (
            unique_missing[0]
            if len(
                unique_missing
            ) == 1
            else "INCONSISTENT"
        )
    )

    print(
        "  Sibling Δ:     "
        + (
            f"{layout_agreement:.4f}"
            if layout_agreement
            is not None
            else "n/a"
        )
    )

    if (
        mirror_hits == len(results)
        and len(unique_missing) == 1
        and layout_agreement is not None
        and layout_agreement <= 0.03
    ):
        verdict = (
            "STRONG MIRROR WITNESS"
        )

    elif (
        mirror_hits > 0
        and len(unique_missing) == 1
    ):
        verdict = (
            "PARTIAL MIRROR WITNESS"
        )

    else:
        verdict = (
            "MIRROR INCONCLUSIVE"
        )

    print(
        f"  Verdict:       "
        f"{verdict}"
    )

    print()


print(
    "B was rotated and horizontally flipped "
    "FOR COMPARISON ONLY."
)
print(
    "No crops were written."
)
print(
    "No source images were modified."
)
