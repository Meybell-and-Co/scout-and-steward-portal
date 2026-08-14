from pathlib import Path
import csv
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]

WORKING_SOURCE = ROOT / "working" / "source"
OUTPUT_CSV = ROOT / "c-shape-recon.csv"

# We care about the outer portion of the sheet where the black
# Caligari bracket lives, not card artwork in the middle.
EDGE_DEPTH = 0.24

# Dark-pixel threshold. Otsu will establish the image-specific
# threshold; this cap prevents pale card art from becoming "black."
MAX_DARK_THRESHOLD = 105


def dark_mask(image):
    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    gray = cv2.GaussianBlur(
        gray,
        (7, 7),
        0
    )

    otsu_threshold, _ = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    threshold = min(
        float(otsu_threshold),
        MAX_DARK_THRESHOLD
    )

    mask = (
        gray < threshold
    ).astype(np.uint8)

    # Join the physical black-paper region while suppressing
    # isolated dark details in card artwork.
    kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (21, 21)
    )

    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_CLOSE,
        kernel,
        iterations=2
    )

    return mask, threshold


def score_edge(mask, edge):
    h, w = mask.shape

    dx = max(1, int(w * EDGE_DEPTH))
    dy = max(1, int(h * EDGE_DEPTH))

    # A C/bracket has:
    #
    #   backbone = dark material running along one outer edge
    #   arm 1    = dark material extending inward near one end
    #   arm 2    = dark material extending inward near the other end
    #
    # We score those three pieces independently.

    if edge == "left":
        backbone = mask[:, :dx]
        arm_1 = mask[:dy, :w // 2]
        arm_2 = mask[h - dy:, :w // 2]

    elif edge == "right":
        backbone = mask[:, w - dx:]
        arm_1 = mask[:dy, w // 2:]
        arm_2 = mask[h - dy:, w // 2:]

    elif edge == "top":
        backbone = mask[:dy, :]
        arm_1 = mask[:h // 2, :dx]
        arm_2 = mask[:h // 2, w - dx:]

    elif edge == "bottom":
        backbone = mask[h - dy:, :]
        arm_1 = mask[h // 2:, :dx]
        arm_2 = mask[h // 2:, w - dx:]

    else:
        raise ValueError(edge)

    backbone_score = float(np.mean(backbone))
    arm_1_score = float(np.mean(arm_1))
    arm_2_score = float(np.mean(arm_2))

    # Requiring BOTH arms is the important change from our old
    # "darkest edge" experiment.
    weakest_arm = min(
        arm_1_score,
        arm_2_score
    )

    # Backbone matters most, but a candidate gets rewarded only
    # when both ends of the C are represented.
    total_score = (
        backbone_score * 0.55 +
        weakest_arm * 0.45
    )

    return {
        "score": total_score,
        "backbone": backbone_score,
        "arm1": arm_1_score,
        "arm2": arm_2_score,
    }


def source_layout_from_pair(pair_key):
    parts = pair_key.split("_")

    if parts[-1].isdigit() and len(parts[-1]) == 2:
        return "_".join(parts[:-1])

    return pair_key


# One representative A-side image per unique physical 4-UP layout.
#
# Example:
# UD_001_B_045_01_a.jpg
#          pair key ^^^
# UD_001_B_045
#          layout ^

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

for layout, path in sorted(layout_files.items()):
    image = cv2.imread(str(path))

    if image is None:
        print(f"SKIP unreadable: {path.name}")
        continue

    mask, threshold = dark_mask(image)

    scores = {}

    for edge in (
        "top",
        "right",
        "bottom",
        "left",
    ):
        scores[edge] = score_edge(
            mask,
            edge
        )

    ranked = sorted(
        scores.items(),
        key=lambda item: item[1]["score"],
        reverse=True
    )

    winner_edge, winner = ranked[0]
    runner_edge, runner = ranked[1]

    margin = (
        winner["score"] -
        runner["score"]
    )

    records.append({
        "SourceLayout": layout,
        "SourceFile": path.name,
        "CGuess": winner_edge,
        "Margin": round(margin, 4),
        "Threshold": round(threshold, 1),

        "TopScore": round(
            scores["top"]["score"],
            4
        ),
        "RightScore": round(
            scores["right"]["score"],
            4
        ),
        "BottomScore": round(
            scores["bottom"]["score"],
            4
        ),
        "LeftScore": round(
            scores["left"]["score"],
            4
        ),

        "WinnerBackbone": round(
            winner["backbone"],
            4
        ),
        "WinnerArm1": round(
            winner["arm1"],
            4
        ),
        "WinnerArm2": round(
            winner["arm2"],
            4
        ),
    })

    print(
        f"{layout}: "
        f"C={winner_edge.upper()} "
        f"score={winner['score']:.4f} "
        f"margin={margin:.4f} "
        f"runner={runner_edge.upper()}"
    )


fieldnames = [
    "SourceLayout",
    "SourceFile",
    "CGuess",
    "Margin",
    "Threshold",
    "TopScore",
    "RightScore",
    "BottomScore",
    "LeftScore",
    "WinnerBackbone",
    "WinnerArm1",
    "WinnerArm2",
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
print("TURTLE C-SHAPE RECON")
print("--------------------")
print(f"Unique layouts: {len(records)}")
print(f"Output:         {OUTPUT_CSV}")
print()
print("No source images were modified.")
