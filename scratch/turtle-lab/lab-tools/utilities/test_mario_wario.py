from pathlib import Path
import csv
import cv2
import numpy as np


ROOT = Path(__file__).parent

WORKING_SOURCE = (
    ROOT /
    "working" /
    "source"
)

ORIENTATION_PLAN = (
    ROOT /
    "orientation-plan.csv"
)

OUTPUT_CSV = (
    ROOT /
    "mario-wario-results.csv"
)


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


def rotate_quarters(image, turns):
    """
    Rotate clockwise in 90-degree increments.
    """

    turns %= 4

    if turns == 0:
        return image

    if turns == 1:
        return cv2.rotate(
            image,
            cv2.ROTATE_90_CLOCKWISE
        )

    if turns == 2:
        return cv2.rotate(
            image,
            cv2.ROTATE_180
        )

    return cv2.rotate(
        image,
        cv2.ROTATE_90_COUNTERCLOCKWISE
    )


def turns_to_open_top(backbone):
    """
    Human truth records the C backbone.

    The opening is opposite the backbone.

    Canonical orientation requires:
        opening = TOP
        backbone = BOTTOM

    Return clockwise quarter-turns required.
    """

    backbone = backbone.lower()

    turns = {
        "bottom": 0,
        "right": 1,
        "top": 2,
        "left": 3,
    }

    if backbone not in turns:
        raise ValueError(
            f"Unknown backbone: {backbone}"
        )

    return turns[backbone]


def load_orientation_truth():
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
            layout = row["SourceLayout"].strip()

            reviewed = (
                row.get("Reviewed") or ""
            ).strip().lower()

            turtle_guess = (
                row.get("TurtleGuess") or ""
            ).strip().lower()

            if reviewed == "pass":
                actual = turtle_guess
            elif reviewed in {
                "top",
                "right",
                "bottom",
                "left",
            }:
                actual = reviewed
            else:
                raise ValueError(
                    f"Orientation truth incomplete "
                    f"for {layout}: "
                    f"Reviewed={reviewed!r}"
                )

            truth[layout] = actual

    return truth


def structural_signature(image):
    """
    Deliberately destroy fine card-face detail while
    preserving large-scale spatial structure.

    Steps:
      1. grayscale
      2. heavy Gaussian blur
      3. downsample
      4. normalize brightness/contrast
    """

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    height, width = gray.shape[:2]

    # Kernel scales with the photograph rather than
    # assuming every source has identical dimensions.
    kernel = max(
        31,
        int(min(width, height) * 0.035)
    )

    if kernel % 2 == 0:
        kernel += 1

    blurred = cv2.GaussianBlur(
        gray,
        (kernel, kernel),
        0
    )

    signature = cv2.resize(
        blurred,
        (160, 120),
        interpolation=cv2.INTER_AREA
    )

    signature = signature.astype(
        np.float32
    )

    mean = float(signature.mean())
    std = float(signature.std())

    if std < 1e-6:
        std = 1.0

    signature = (
        signature - mean
    ) / std

    return signature


def structural_score(a_image, b_image):
    """
    Higher is better.

    Compare normalized large-scale structure using
    mean absolute difference.
    """

    a = structural_signature(a_image)
    b = structural_signature(b_image)

    difference = float(
        np.mean(
            np.abs(a - b)
        )
    )

    # Convert distance to a convenient higher-is-better
    # score. Absolute magnitude is less important than
    # winner and margin.
    return 1.0 / (
        1.0 + difference
    )


# ---------------------------------------------------------
# Build roster
# ---------------------------------------------------------

if not WORKING_SOURCE.exists():
    raise FileNotFoundError(
        f"Working source not found: "
        f"{WORKING_SOURCE}"
    )


truth = load_orientation_truth()


files = {
    path.name.lower(): path
    for path in WORKING_SOURCE.glob("*.jpg")
}


a_paths = sorted(
    path
    for path in WORKING_SOURCE.glob("*_a.jpg")
)


records = []


# ---------------------------------------------------------
# Audition
# ---------------------------------------------------------

for a_path in a_paths:

    pair_key = a_path.stem[:-2]

    b_name = (
        f"{pair_key}_b.jpg"
    ).lower()

    b_path = files.get(b_name)

    if b_path is None:
        print(
            f"SKIP: {pair_key} "
            f"has no B image"
        )
        continue

    source_layout = (
        source_layout_from_pair_key(
            pair_key
        )
    )

    backbone = truth.get(
        source_layout
    )

    if backbone is None:
        print(
            f"SKIP: {pair_key} "
            f"has no orientation truth"
        )
        continue

    a_image = cv2.imread(
        str(a_path)
    )

    b_image = cv2.imread(
        str(b_path)
    )

    if (
        a_image is None
        or b_image is None
    ):
        print(
            f"SKIP: unable to read "
            f"{pair_key}"
        )
        continue

    # Canonicalize A:
    # C opening always TOP.
    a_turns = turns_to_open_top(
        backbone
    )

    canonical_a = rotate_quarters(
        a_image,
        a_turns
    )

    scores = {}

    for b_turns in range(4):

        rotated_b = rotate_quarters(
            b_image,
            b_turns
        )

        # Mario/Wario test:
        # temporarily turn B back into Mario.
        comparison_b = cv2.flip(
            rotated_b,
            1
        )

        score = structural_score(
            canonical_a,
            comparison_b
        )

        scores[b_turns] = score

    ranked = sorted(
        scores.items(),
        key=lambda item: item[1],
        reverse=True
    )

    winner_turns, winner_score = (
        ranked[0]
    )

    runner_turns, runner_score = (
        ranked[1]
    )

    margin = (
        winner_score -
        runner_score
    )

    records.append({
        "PairKey": pair_key,
        "SourceLayout": source_layout,
        "ABackbone": backbone,
        "ARotateCW": a_turns * 90,
        "BWinnerCW": winner_turns * 90,
        "WinnerScore": round(
            winner_score,
            6
        ),
        "RunnerUpCW": runner_turns * 90,
        "RunnerUpScore": round(
            runner_score,
            6
        ),
        "Margin": round(
            margin,
            6
        ),
        "Score0": round(
            scores[0],
            6
        ),
        "Score90": round(
            scores[1],
            6
        ),
        "Score180": round(
            scores[2],
            6
        ),
        "Score270": round(
            scores[3],
            6
        ),
    })


# ---------------------------------------------------------
# Write results
# ---------------------------------------------------------

fieldnames = [
    "PairKey",
    "SourceLayout",
    "ABackbone",
    "ARotateCW",
    "BWinnerCW",
    "WinnerScore",
    "RunnerUpCW",
    "RunnerUpScore",
    "Margin",
    "Score0",
    "Score90",
    "Score180",
    "Score270",
]


with OUTPUT_CSV.open(
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
# Layout consensus
# ---------------------------------------------------------

by_layout = {}

for record in records:
    by_layout.setdefault(
        record["SourceLayout"],
        []
    ).append(record)


unanimous = []
split = []


for layout, group in sorted(
    by_layout.items()
):

    winners = {
        row["BWinnerCW"]
        for row in group
    }

    if len(winners) == 1:
        unanimous.append(
            (layout, group)
        )
    else:
        split.append(
            (layout, group)
        )


# ---------------------------------------------------------
# Report
# ---------------------------------------------------------

print()
print(
    "TURTLE MARIO/WARIO AUDITION"
)
print(
    "---------------------------"
)
print(
    f"Pairs tested:    "
    f"{len(records)}"
)
print(
    f"Unique layouts:  "
    f"{len(by_layout)}"
)
print()


print("B ROTATION WINNERS")
print("------------------")

for degrees in (
    0,
    90,
    180,
    270
):
    count = sum(
        1
        for row in records
        if row["BWinnerCW"] == degrees
    )

    print(
        f"{degrees:>3}°: "
        f"{count}"
    )


print()
print("LAYOUT CONSENSUS")
print("----------------")
print(
    f"Unanimous:       "
    f"{len(unanimous)}/"
    f"{len(by_layout)}"
)
print(
    f"Split:           "
    f"{len(split)}/"
    f"{len(by_layout)}"
)


if split:
    print()
    print("SPLIT LAYOUTS")
    print("-------------")

    for layout, group in split:

        result = ", ".join(
            f"{row['PairKey']}="
            f"{row['BWinnerCW']}°"
            for row in group
        )

        print(
            f"{layout}: {result}"
        )


print()
print("20 LOWEST MARGINS")
print("-----------------")

for row in sorted(
    records,
    key=lambda item: item["Margin"]
)[:20]:

    print(
        f"{row['PairKey']}: "
        f"B={row['BWinnerCW']}° "
        f"score={row['WinnerScore']:.6f} "
        f"runner={row['RunnerUpCW']}° "
        f"margin={row['Margin']:.6f}"
    )


print()
print(
    f"Full results: "
    f"{OUTPUT_CSV}"
)
print(
    "No source images were modified."
)