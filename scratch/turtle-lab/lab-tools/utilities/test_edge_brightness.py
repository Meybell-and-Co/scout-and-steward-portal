from pathlib import Path
import csv
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]

WORKING_SOURCE = ROOT / "working" / "source"
OUTPUT_CSV = ROOT / "edge-250-recon.csv"

EDGE_WIDTH = 250


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


a_files = sorted(
    WORKING_SOURCE.glob("*_a.jpg")
)

layout_files = {}

for path in a_files:
    pair_key = path.stem[:-2]
    layout = source_layout_from_pair(pair_key)

    layout_files.setdefault(
        layout,
        path
    )


records = []

opposite = {
    "top": "bottom",
    "right": "left",
    "bottom": "top",
    "left": "right",
}


for layout, path in sorted(layout_files.items()):
    image = cv2.imread(str(path))

    if image is None:
        print(f"SKIP unreadable: {path.name}")
        continue

    height, width = image.shape[:2]

    if width < EDGE_WIDTH * 2 or height < EDGE_WIDTH * 2:
        print(
            f"SKIP too small: {path.name} "
            f"({width}x{height})"
        )
        continue

    strips = {
        "top": image[
            0:EDGE_WIDTH,
            :
        ],

        "right": image[
            :,
            width - EDGE_WIDTH:width
        ],

        "bottom": image[
            height - EDGE_WIDTH:height,
            :
        ],

        "left": image[
            :,
            0:EDGE_WIDTH
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

    open_edge, open_value = ranked[0]
    runner_edge, runner_value = ranked[1]

    backbone = opposite[open_edge]

    margin = open_value - runner_value

    records.append({
        "SourceLayout": layout,
        "SourceFile": path.name,

        "OpenGuess": open_edge,
        "BackboneGuess": backbone,

        "Margin": round(margin, 2),

        "TopBrightness": round(
            brightness["top"],
            2
        ),
        "RightBrightness": round(
            brightness["right"],
            2
        ),
        "BottomBrightness": round(
            brightness["bottom"],
            2
        ),
        "LeftBrightness": round(
            brightness["left"],
            2
        ),
    })

    print(
        f"{layout}: "
        f"OPEN={open_edge.upper()} "
        f"BACKBONE={backbone.upper()} "
        f"margin={margin:.2f} "
        f"brightness="
        f"T{brightness['top']:.1f} "
        f"R{brightness['right']:.1f} "
        f"B{brightness['bottom']:.1f} "
        f"L{brightness['left']:.1f}"
    )


fieldnames = [
    "SourceLayout",
    "SourceFile",
    "OpenGuess",
    "BackboneGuess",
    "Margin",
    "TopBrightness",
    "RightBrightness",
    "BottomBrightness",
    "LeftBrightness",
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


print()
print("TURTLE 250PX EDGE RECON")
print("-----------------------")
print(f"Unique layouts: {len(records)}")
print(f"Edge width:     {EDGE_WIDTH}px")
print(f"Output:         {OUTPUT_CSV}")
print()
print("No source images were modified.")
