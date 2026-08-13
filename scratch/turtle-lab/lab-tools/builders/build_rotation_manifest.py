from pathlib import Path
import csv
from collections import Counter, defaultdict


ROOT = Path(__file__).parent

SOURCE = (
    ROOT /
    "working" /
    "source"
)

ORIENTATION_PLAN = (
    ROOT /
    "orientation-plan.csv"
)

MARIO_RESULTS = (
    ROOT /
    "mario-wario-results.csv"
)

B_ORIENTATION_OVERRIDES = (
    ROOT /
    "b-orientation-overrides.csv"
)

OUTPUT = (
    ROOT /
    "production-rotation-manifest.csv"
)


VALID_BACKBONES = {
    "top",
    "right",
    "bottom",
    "left",
}


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------

def source_layout_from_pair_key(pair_key):
    """
    Collapse:
        UD_001_B_045_01
    to:
        UD_001_B_045
    """

    parts = pair_key.rsplit("_", 1)

    if (
        len(parts) == 2
        and len(parts[1]) == 2
        and parts[1].isdigit()
    ):
        return parts[0]

    return pair_key


def turns_to_open_top(backbone):
    """
    Human truth records the C backbone.

    Canonical target:
        backbone = BOTTOM
        opening  = TOP

    Returns clockwise rotation in degrees.
    """

    rotations = {
        "bottom": 0,
        "right": 90,
        "top": 180,
        "left": 270,
    }

    return rotations[backbone]


def load_orientation_truth():
    """
    Load HUMAN-AUDITED A orientation truth.

    PASS means TurtleGuess was confirmed.
    Otherwise Reviewed contains the actual backbone.
    """

    if not ORIENTATION_PLAN.exists():
        raise FileNotFoundError(
            f"Missing orientation plan: "
            f"{ORIENTATION_PLAN}"
        )

    truth = {}

    with ORIENTATION_PLAN.open(
        newline="",
        encoding="utf-8-sig"
    ) as handle:

        reader = csv.DictReader(handle)

        for row in reader:

            layout = (
                row["SourceLayout"]
                .strip()
            )

            turtle = (
                row.get("TurtleGuess") or ""
            ).strip().lower()

            reviewed = (
                row.get("Reviewed") or ""
            ).strip().lower()

            if reviewed == "pass":
                actual = turtle
                source = "human-confirmed-turtle"

            elif reviewed in VALID_BACKBONES:
                actual = reviewed
                source = "human-corrected"

            else:
                raise ValueError(
                    f"Incomplete A orientation truth "
                    f"for {layout}: "
                    f"Reviewed={reviewed!r}"
                )

            if actual not in VALID_BACKBONES:
                raise ValueError(
                    f"Invalid backbone for "
                    f"{layout}: {actual!r}"
                )

            truth[layout] = {
                "backbone": actual,
                "rotation": (
                    turns_to_open_top(actual)
                ),
                "source": source,
            }

    return truth


def load_mario_truth():
    """
    Mario/Wario results were independently verified
    across all 54 layouts.

    All 214 repeated pair records agreed within their
    respective layouts.

    The two visually re-reviewed layouts:
        UD_002_A_0099
        UD_002_B_0003
    both independently confirmed Turtle's original
    270-degree answer.

    Therefore BWinnerCW is our verified B rotation.
    """

    if not MARIO_RESULTS.exists():
        raise FileNotFoundError(
            f"Missing Mario/Wario results: "
            f"{MARIO_RESULTS}"
        )

    by_layout = defaultdict(list)

    with MARIO_RESULTS.open(
        newline="",
        encoding="utf-8-sig"
    ) as handle:

        reader = csv.DictReader(handle)

        for row in reader:

            layout = (
                row["SourceLayout"]
                .strip()
            )

            rotation = int(
                row["BWinnerCW"]
            )

            if rotation not in {
                0,
                90,
                180,
                270,
            }:
                raise ValueError(
                    f"Invalid B rotation for "
                    f"{row['PairKey']}: "
                    f"{rotation}"
                )

            by_layout[layout].append({
                "pair_key": row["PairKey"],
                "rotation": rotation,
                "margin": float(
                    row["Margin"]
                ),
            })

    truth = {}

    for layout, rows in by_layout.items():

        rotations = {
            row["rotation"]
            for row in rows
        }

        if len(rotations) != 1:
            raise ValueError(
                f"Split Mario/Wario result "
                f"for {layout}: "
                f"{sorted(rotations)}"
            )

        rotation = next(
            iter(rotations)
        )

        truth[layout] = {
            "rotation": rotation,
            "minimum_margin": min(
                row["margin"]
                for row in rows
            ),
            "copies": len(rows),
            "source": "wario-verified",
        }

    return truth


def apply_b_orientation_overrides(truth):
    """
    Apply explicit human-reviewed B rotation corrections.

    Mario/Wario results remain unchanged as historical
    algorithm output. Overrides affect production truth only.
    """

    if not B_ORIENTATION_OVERRIDES.exists():
        raise FileNotFoundError(
            f"Missing B orientation overrides: "
            f"{B_ORIENTATION_OVERRIDES}"
        )

    seen = set()

    with B_ORIENTATION_OVERRIDES.open(
        newline="",
        encoding="utf-8-sig"
    ) as handle:

        reader = csv.DictReader(handle)

        expected_fields = {
            "SourceLayout",
            "BRotateCW",
        }

        if set(reader.fieldnames or []) != expected_fields:
            raise ValueError(
                "B orientation override columns must be "
                "exactly SourceLayout,BRotateCW"
            )

        for row in reader:

            layout = (
                row["SourceLayout"]
                .strip()
            )

            if not layout:
                raise ValueError(
                    "Blank SourceLayout in "
                    "B orientation overrides."
                )

            if layout in seen:
                raise ValueError(
                    f"Duplicate B orientation override: "
                    f"{layout}"
                )

            seen.add(layout)

            if layout not in truth:
                raise ValueError(
                    f"B orientation override references "
                    f"unknown layout: {layout}"
                )

            try:
                rotation = int(
                    row["BRotateCW"]
                )
            except ValueError as exc:
                raise ValueError(
                    f"Invalid B rotation for "
                    f"{layout}: "
                    f"{row['BRotateCW']!r}"
                ) from exc

            if rotation not in {
                0,
                90,
                180,
                270,
            }:
                raise ValueError(
                    f"Invalid B rotation for "
                    f"{layout}: "
                    f"{rotation}"
                )

            truth[layout][
                "rotation"
            ] = rotation

            truth[layout][
                "source"
            ] = "human-corrected"

    return truth


# ---------------------------------------------------------
# Preconditions
# ---------------------------------------------------------

if not SOURCE.exists():
    raise FileNotFoundError(
        f"Working source missing: "
        f"{SOURCE}"
    )


a_truth = load_orientation_truth()
b_truth = load_mario_truth()
b_truth = apply_b_orientation_overrides(
    b_truth
)


if set(a_truth) != set(b_truth):

    only_a = sorted(
        set(a_truth) -
        set(b_truth)
    )

    only_b = sorted(
        set(b_truth) -
        set(a_truth)
    )

    raise RuntimeError(
        "Orientation truth and Mario/Wario truth "
        "do not describe identical layouts.\n"
        f"Only in A truth: {only_a}\n"
        f"Only in B truth: {only_b}"
    )


# ---------------------------------------------------------
# Source attendance
# ---------------------------------------------------------

source_files = sorted(
    SOURCE.glob("*.jpg")
)

file_lookup = {
    path.name.lower(): path
    for path in source_files
}


a_paths = sorted(
    path
    for path in source_files
    if path.stem.lower().endswith("_a")
)


records = []


for a_path in a_paths:

    pair_key = (
        a_path.stem[:-2]
    )

    layout = (
        source_layout_from_pair_key(
            pair_key
        )
    )

    b_name = (
        f"{pair_key}_b.jpg"
    )

    b_path = file_lookup.get(
        b_name.lower()
    )

    if b_path is None:
        raise RuntimeError(
            f"Missing B partner for "
            f"{a_path.name}"
        )

    if layout not in a_truth:
        raise RuntimeError(
            f"No A orientation truth "
            f"for {pair_key} "
            f"(layout={layout})"
        )

    if layout not in b_truth:
        raise RuntimeError(
            f"No B rotation truth "
            f"for {pair_key} "
            f"(layout={layout})"
        )

    a_info = a_truth[layout]
    b_info = b_truth[layout]

    records.append({
        "PairKey": pair_key,
        "SourceLayout": layout,

        "AFile": a_path.name,
        "BFile": b_path.name,

        "ABackbone": (
            a_info["backbone"]
        ),

        "ARotateCW": (
            a_info["rotation"]
        ),

        "AOrientationSource": (
            a_info["source"]
        ),

        "BRotateCW": (
            b_info["rotation"]
        ),

        "BOrientationSource": (
            b_info["source"]
        ),

        "BMatchMinMargin": round(
            b_info["minimum_margin"],
            6
        ),

        "LayoutCopies": (
            b_info["copies"]
        ),

        "Status": "READY",
    })


# ---------------------------------------------------------
# Hard assertions
# ---------------------------------------------------------

if len(source_files) != 428:
    raise RuntimeError(
        f"Expected 428 JPG source files; "
        f"found {len(source_files)}"
    )


if len(records) != 214:
    raise RuntimeError(
        f"Expected 214 A/B pairs; "
        f"found {len(records)}"
    )


layouts = {
    row["SourceLayout"]
    for row in records
}


if len(layouts) != 54:
    raise RuntimeError(
        f"Expected 54 unique layouts; "
        f"found {len(layouts)}"
    )


if any(
    row["Status"] != "READY"
    for row in records
):
    raise RuntimeError(
        "One or more production rows "
        "are not READY."
    )


# ---------------------------------------------------------
# Write manifest
# ---------------------------------------------------------

fieldnames = [
    "PairKey",
    "SourceLayout",
    "AFile",
    "BFile",
    "ABackbone",
    "ARotateCW",
    "AOrientationSource",
    "BRotateCW",
    "BOrientationSource",
    "BMatchMinMargin",
    "LayoutCopies",
    "Status",
]


with OUTPUT.open(
    "w",
    newline="",
    encoding="utf-8"
) as handle:

    writer = csv.DictWriter(
        handle,
        fieldnames=fieldnames
    )

    writer.writeheader()
    writer.writerows(records)


# ---------------------------------------------------------
# Report
# ---------------------------------------------------------

a_rotation_counts = Counter(
    row["ARotateCW"]
    for row in records
)

b_rotation_counts = Counter(
    row["BRotateCW"]
    for row in records
)

a_source_counts = Counter(
    row["AOrientationSource"]
    for row in records
)


print()
print(
    "TURTLE PRODUCTION ROTATION PLAN"
)
print(
    "-------------------------------"
)
print(
    f"Source files:      "
    f"{len(source_files)}"
)
print(
    f"A/B pairs:         "
    f"{len(records)}"
)
print(
    f"Unique layouts:    "
    f"{len(layouts)}"
)
print(
    f"READY:             "
    f"{len(records)}"
)
print()


print("A ROTATIONS")
print("-----------")

for degrees in (
    0,
    90,
    180,
    270
):
    print(
        f"{degrees:>3}°: "
        f"{a_rotation_counts[degrees]}"
    )


print()
print("B ROTATIONS")
print("-----------")

for degrees in (
    0,
    90,
    180,
    270
):
    print(
        f"{degrees:>3}°: "
        f"{b_rotation_counts[degrees]}"
    )


print()
print("A ORIENTATION TRUTH")
print("-------------------")

for source, count in sorted(
    a_source_counts.items()
):
    print(
        f"{source}: {count}"
    )


print()
print("LOWEST B MATCH MARGINS")
print("----------------------")

seen_layouts = set()

for row in sorted(
    records,
    key=lambda item: (
        item["BMatchMinMargin"]
    )
):

    layout = row["SourceLayout"]

    if layout in seen_layouts:
        continue

    seen_layouts.add(layout)

    print(
        f"{layout}: "
        f"B={row['BRotateCW']}° "
        f"margin="
        f"{row['BMatchMinMargin']:.6f}"
    )

    if len(seen_layouts) >= 10:
        break


print()
print(
    f"Manifest: "
    f"{OUTPUT}"
)
print()
print(
    "DRY RUN ONLY."
)
print(
    "No images were rotated."
)
print(
    "No source images were modified."
)
