from pathlib import Path
import csv
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]

WORKING_SOURCE = ROOT / "working" / "source"
PLAN_CSV = ROOT / "orientation-plan.csv"
OUTPUT_CSV = ROOT / "edge-width-results.csv"

EDGE_WIDTHS = list(range(150, 176, 5))

OPPOSITE = {
    "top": "bottom",
    "right": "left",
    "bottom": "top",
    "left": "right",
}


def source_layout_from_pair(pair_key):
    parts = pair_key.split("_")

    if parts[-1].isdigit() and len(parts[-1]) == 2:
        return "_".join(parts[:-1])

    return pair_key


def mean_brightness(strip):
    gray = cv2.cvtColor(
        strip,
        cv2.COLOR_BGR2GRAY
    )

    return float(np.mean(gray))


# ---------------------------------------------------------
# Human truth
# ---------------------------------------------------------

truth = {}

with PLAN_CSV.open(
    newline="",
    encoding="utf-8-sig"
) as handle:

    reader = csv.DictReader(handle)

    for row in reader:
        reviewed = row["Reviewed"].strip().lower()
        turtle_guess = row["TurtleGuess"].strip().lower()

        if reviewed == "pass":
            actual = turtle_guess
        else:
            actual = reviewed

        truth[row["SourceLayout"]] = actual


# ---------------------------------------------------------
# One representative A image per unique layout
# ---------------------------------------------------------

layout_files = {}

for path in sorted(
    WORKING_SOURCE.glob("*_a.jpg")
):
    pair_key = path.stem[:-2]

    layout = source_layout_from_pair(
        pair_key
    )

    layout_files.setdefault(
        layout,
        path
    )


print()
print("TURTLE RULER AUDITION")
print("---------------------")
print(f"Human truth:    {len(truth)} layouts")
print(f"Images found:   {len(layout_files)} layouts")
print(
    f"Widths tested:  "
    f"{EDGE_WIDTHS[0]}-{EDGE_WIDTHS[-1]}px "
    f"in 25px steps"
)
print()


# ---------------------------------------------------------
# Test every width
# ---------------------------------------------------------

summary = []
detail = []

for edge_width in EDGE_WIDTHS:

    passed = 0
    failed = 0

    for layout, path in sorted(
        layout_files.items()
    ):
        actual = truth.get(layout)

        if actual is None:
            continue

        image = cv2.imread(str(path))

        if image is None:
            continue

        height, width = image.shape[:2]

        if (
            width < edge_width * 2 or
            height < edge_width * 2
        ):
            continue

        strips = {
            "top": image[
                0:edge_width,
                :
            ],

            "right": image[
                :,
                width - edge_width:width
            ],

            "bottom": image[
                height - edge_width:height,
                :
            ],

            "left": image[
                :,
                0:edge_width
            ],
        }

        brightness = {
            edge: mean_brightness(strip)
            for edge, strip in strips.items()
        }

        ranked = sorted(
            brightness.items(),
            key=lambda item: item[1],
            reverse=True
        )

        open_guess = ranked[0][0]
        backbone_guess = OPPOSITE[open_guess]

        margin = (
            ranked[0][1] -
            ranked[1][1]
        )

        result = (
            "PASS"
            if backbone_guess == actual
            else "FAIL"
        )

        if result == "PASS":
            passed += 1
        else:
            failed += 1

        detail.append({
            "EdgeWidth": edge_width,
            "SourceLayout": layout,
            "OpenGuess": open_guess,
            "BackboneGuess": backbone_guess,
            "Actual": actual,
            "Margin": round(margin, 2),
            "Result": result,
        })

    total = passed + failed

    accuracy = (
        100.0 * passed / total
        if total
        else 0.0
    )

    summary.append({
        "EdgeWidth": edge_width,
        "Passed": passed,
        "Failed": failed,
        "Total": total,
        "Accuracy": accuracy,
    })

    print(
        f"{edge_width:>3}px: "
        f"{passed:>2}/{total} "
        f"({accuracy:5.1f}%)"
    )


# ---------------------------------------------------------
# Rank the rulers
# ---------------------------------------------------------

ranked_summary = sorted(
    summary,
    key=lambda row: (
        -row["Passed"],
        abs(row["EdgeWidth"] - 250)
    )
)

best = ranked_summary[0]

print()
print("BEST RULER")
print("----------")
print(
    f"{best['EdgeWidth']}px: "
    f"{best['Passed']}/{best['Total']} "
    f"({best['Accuracy']:.1f}%)"
)


# ---------------------------------------------------------
# Show failures for winning width
# ---------------------------------------------------------

best_failures = [
    row
    for row in detail
    if (
        row["EdgeWidth"] == best["EdgeWidth"]
        and row["Result"] == "FAIL"
    )
]

print()
print("BEST-RULER FAILURES")
print("-------------------")

if not best_failures:
    print("NONE. TURTLE HAS ACHIEVED PERIMETER NIRVANA.")
else:
    for row in sorted(
        best_failures,
        key=lambda item: item["Margin"]
    ):
        print(
            f"{row['SourceLayout']}: "
            f"guess={row['BackboneGuess'].upper()} "
            f"actual={row['Actual'].upper()} "
            f"margin={row['Margin']:.2f}"
        )


# ---------------------------------------------------------
# Save complete results
# ---------------------------------------------------------

with OUTPUT_CSV.open(
    "w",
    newline="",
    encoding="utf-8"
) as handle:

    fieldnames = [
        "EdgeWidth",
        "SourceLayout",
        "OpenGuess",
        "BackboneGuess",
        "Actual",
        "Margin",
        "Result",
    ]

    writer = csv.DictWriter(
        handle,
        fieldnames=fieldnames
    )

    writer.writeheader()
    writer.writerows(detail)


print()
print(f"Full results: {OUTPUT_CSV}")
print("No source images were modified.")
