from pathlib import Path
import math
import sys

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[2]

sys.path.insert(0, str(ROOT / "2up"))

from test_autocrop_2up import detect_best_candidates


SOURCE = Path(
    r"C:\Users\Meybells\Downloads\incoming-assets\inventory-photos\s-and-s-sports-memorabilia\4UP\oriented"
)

OUTPUT = ROOT / "rescue-overlay-audition"

FAILURES = [
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
]

SLOTS = {
    "TOP-LEFT": (0, 0),
    "TOP-RIGHT": (1, 0),
    "BOTTOM-LEFT": (0, 1),
    "BOTTOM-RIGHT": (1, 1),
}


def center_of(box):
    return np.mean(
        np.asarray(box, dtype=np.float32),
        axis=0
    )


def slot_name(box, image):
    h, w = image.shape[:2]
    cx, cy = center_of(box)

    vertical = "TOP" if cy < h / 2 else "BOTTOM"
    horizontal = "LEFT" if cx < w / 2 else "RIGHT"

    return f"{vertical}-{horizontal}"


def normalize_box(box):
    box = np.asarray(
        box,
        dtype=np.float32
    )

    center = np.mean(box, axis=0)

    angles = np.arctan2(
        box[:, 1] - center[1],
        box[:, 0] - center[0]
    )

    return box[
        np.argsort(angles)
    ]


def candidate_rect(candidate):
    box = np.asarray(
        candidate[1],
        dtype=np.float32
    )

    return cv2.minAreaRect(box)


def median_geometry(candidates):
    widths = []
    heights = []
    angles = []

    for candidate in candidates:
        rect = candidate_rect(candidate)

        w, h = rect[1]
        angle = rect[2]

        if w < h:
            w, h = h, w
            angle += 90.0

        widths.append(w)
        heights.append(h)
        angles.append(angle)

    return (
        float(np.median(widths)),
        float(np.median(heights)),
        float(np.median(angles)),
    )


def expected_center(missing_slot, occupied):
    col, row = SLOTS[missing_slot]

    same_column = []
    same_row = []

    for name, candidate in occupied.items():
        candidate_col, candidate_row = SLOTS[name]
        center = center_of(candidate[1])

        if candidate_col == col:
            same_column.append(center)

        if candidate_row == row:
            same_row.append(center)

    x = None
    y = None

    if same_column:
        x = float(
            np.mean([
                point[0]
                for point in same_column
            ])
        )

    if same_row:
        y = float(
            np.mean([
                point[1]
                for point in same_row
            ])
        )

    all_centers = [
        center_of(candidate[1])
        for candidate in occupied.values()
    ]

    if x is None:
        known_x = float(
            np.mean([
                point[0]
                for point in all_centers
            ])
        )

        image_mid = float(
            np.mean([
                point[0]
                for point in all_centers
            ])
        )

        x = known_x

    if y is None:
        y = float(
            np.mean([
                point[1]
                for point in all_centers
            ])
        )

    # Three-card layouts give us the missing center much
    # more reliably by parallelogram completion.
    names = set(occupied)

    if missing_slot == "TOP-LEFT":
        if {
            "TOP-RIGHT",
            "BOTTOM-LEFT",
            "BOTTOM-RIGHT",
        } <= names:
            x = (
                center_of(
                    occupied["TOP-RIGHT"][1]
                )[0]
                + center_of(
                    occupied["BOTTOM-LEFT"][1]
                )[0]
                - center_of(
                    occupied["BOTTOM-RIGHT"][1]
                )[0]
            )

            y = (
                center_of(
                    occupied["TOP-RIGHT"][1]
                )[1]
                + center_of(
                    occupied["BOTTOM-LEFT"][1]
                )[1]
                - center_of(
                    occupied["BOTTOM-RIGHT"][1]
                )[1]
            )

    elif missing_slot == "TOP-RIGHT":
        if {
            "TOP-LEFT",
            "BOTTOM-LEFT",
            "BOTTOM-RIGHT",
        } <= names:
            x = (
                center_of(
                    occupied["TOP-LEFT"][1]
                )[0]
                + center_of(
                    occupied["BOTTOM-RIGHT"][1]
                )[0]
                - center_of(
                    occupied["BOTTOM-LEFT"][1]
                )[0]
            )

            y = (
                center_of(
                    occupied["TOP-LEFT"][1]
                )[1]
                + center_of(
                    occupied["BOTTOM-RIGHT"][1]
                )[1]
                - center_of(
                    occupied["BOTTOM-LEFT"][1]
                )[1]
            )

    elif missing_slot == "BOTTOM-LEFT":
        if {
            "TOP-LEFT",
            "TOP-RIGHT",
            "BOTTOM-RIGHT",
        } <= names:
            x = (
                center_of(
                    occupied["TOP-LEFT"][1]
                )[0]
                + center_of(
                    occupied["BOTTOM-RIGHT"][1]
                )[0]
                - center_of(
                    occupied["TOP-RIGHT"][1]
                )[0]
            )

            y = (
                center_of(
                    occupied["TOP-LEFT"][1]
                )[1]
                + center_of(
                    occupied["BOTTOM-RIGHT"][1]
                )[1]
                - center_of(
                    occupied["TOP-RIGHT"][1]
                )[1]
            )

    elif missing_slot == "BOTTOM-RIGHT":
        if {
            "TOP-LEFT",
            "TOP-RIGHT",
            "BOTTOM-LEFT",
        } <= names:
            x = (
                center_of(
                    occupied["TOP-RIGHT"][1]
                )[0]
                + center_of(
                    occupied["BOTTOM-LEFT"][1]
                )[0]
                - center_of(
                    occupied["TOP-LEFT"][1]
                )[0]
            )

            y = (
                center_of(
                    occupied["TOP-RIGHT"][1]
                )[1]
                + center_of(
                    occupied["BOTTOM-LEFT"][1]
                )[1]
                - center_of(
                    occupied["TOP-LEFT"][1]
                )[1]
            )

    return np.array(
        [x, y],
        dtype=np.float32
    )


def projected_box(center, width, height, angle):
    rect = (
        tuple(float(v) for v in center),
        (float(width), float(height)),
        float(angle),
    )

    return cv2.boxPoints(rect)


def sample_bed(image, box):
    h, w = image.shape[:2]

    x, y, bw, bh = cv2.boundingRect(
        np.asarray(
            box,
            dtype=np.float32
        )
    )

    margin = max(
        30,
        int(min(bw, bh) * 0.10)
    )

    x1 = max(0, x - margin)
    y1 = max(0, y - margin)
    x2 = min(w, x + bw + margin)
    y2 = min(h, y + bh + margin)

    roi = image[
        y1:y2,
        x1:x2
    ]

    mask = np.ones(
        roi.shape[:2],
        dtype=np.uint8
    ) * 255

    shifted = np.asarray(
        box,
        dtype=np.int32
    ).copy()

    shifted[:, 0] -= x1
    shifted[:, 1] -= y1

    cv2.fillConvexPoly(
        mask,
        shifted,
        0
    )

    pixels = roi[
        mask > 0
    ]

    if len(pixels) == 0:
        return None

    hsv = cv2.cvtColor(
        pixels.reshape(-1, 1, 3),
        cv2.COLOR_BGR2HSV
    ).reshape(-1, 3)

    return {
        "bgr": np.median(
            pixels,
            axis=0
        ),
        "hsv": np.median(
            hsv,
            axis=0
        ),
    }


def bed_distance_map(image, bed_samples):
    valid = [
        sample
        for sample in bed_samples
        if sample is not None
    ]

    if not valid:
        return None

    bed_bgr = np.median(
        np.asarray([
            sample["bgr"]
            for sample in valid
        ]),
        axis=0
    )

    lab = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2LAB
    ).astype(np.float32)

    bed_pixel = np.uint8(
        [[bed_bgr]]
    )

    bed_lab = cv2.cvtColor(
        bed_pixel,
        cv2.COLOR_BGR2LAB
    ).astype(np.float32)[0, 0]

    delta = np.linalg.norm(
        lab - bed_lab,
        axis=2
    )

    return delta


def white_mask(image):
    hsv = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2HSV
    )

    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]

    return (
        (value >= 245)
        &
        (saturation <= 20)
    ).astype(np.uint8)


def score_projected_box(
    image,
    box,
    bed_distance,
):
    h, w = image.shape[:2]

    polygon = np.asarray(
        box,
        dtype=np.float32
    )

    x, y, bw, bh = cv2.boundingRect(
        polygon
    )

    x1 = max(0, x)
    y1 = max(0, y)
    x2 = min(w, x + bw)
    y2 = min(h, y + bh)

    if x1 >= x2 or y1 >= y2:
        return 0.0, 0.0

    clipped = polygon.copy()

    mask = np.zeros(
        (h, w),
        dtype=np.uint8
    )

    cv2.fillConvexPoly(
        mask,
        np.round(clipped).astype(np.int32),
        255
    )

    visible = mask > 0

    visible_pixels = int(
        np.count_nonzero(visible)
    )

    projected_area = max(
        1.0,
        abs(
            cv2.contourArea(
                polygon
            )
        )
    )

    visible_ratio = min(
        1.0,
        visible_pixels /
        projected_area
    )

    if (
        bed_distance is None
        or visible_pixels == 0
    ):
        return visible_ratio, 0.0

    departure = float(
        np.median(
            bed_distance[
                visible
            ]
        )
    )

    return (
        visible_ratio,
        departure,
    )


def draw_box(
    canvas,
    box,
    color,
    thickness,
):
    points = np.round(
        box
    ).astype(np.int32)

    cv2.polylines(
        canvas,
        [points],
        True,
        color,
        thickness,
        cv2.LINE_AA
    )


OUTPUT.mkdir(
    parents=True,
    exist_ok=True
)

for old in OUTPUT.glob("*.jpg"):
    old.unlink()


print()
print("RESCUE TURTLE OVERLAY AUDITION")
print("------------------------------")


for layout in FAILURES:

    matches = sorted(
        SOURCE.glob(
            f"{layout}_*_a.jpg"
        ),
        key=lambda p: p.name.lower()
    )

    if not matches:
        print(
            f"{layout}: NO SOURCE"
        )
        continue

    path = matches[0]

    image = cv2.imread(
        str(path)
    )

    if image is None:
        print(
            f"{layout}: UNREADABLE"
        )
        continue

    (
        _,
        candidates,
        detection_pass,
        baseline_count,
    ) = detect_best_candidates(
        image
    )

    if len(candidates) != 3:
        print(
            f"{layout}: "
            f"SKIP {len(candidates)}/4"
        )
        continue

    occupied = {}

    for candidate in candidates:
        occupied[
            slot_name(
                candidate[1],
                image
            )
        ] = candidate

    missing = [
        slot
        for slot in SLOTS
        if slot not in occupied
    ]

    if len(missing) != 1:
        print(
            f"{layout}: "
            "AMBIGUOUS SLOT"
        )
        continue

    missing_slot = missing[0]

    width, height, angle = (
        median_geometry(
            candidates
        )
    )

    center = expected_center(
        missing_slot,
        occupied
    )

    bed_samples = [
        sample_bed(
            image,
            candidate[1]
        )
        for candidate in candidates
    ]

    bed_distance = (
        bed_distance_map(
            image,
            bed_samples
        )
    )

    # Search a modest neighborhood around the
    # geometrically predicted location. This is
    # intentionally constrained: geometry is the
    # backbone; image evidence only nudges it.
    offsets = np.linspace(
        -0.12,
        0.12,
        9
    )

    angle_offsets = [
        -4.0,
        -2.0,
        0.0,
        2.0,
        4.0,
    ]

    best = None

    for dx_ratio in offsets:
        for dy_ratio in offsets:
            for angle_offset in angle_offsets:

                test_center = center + np.array(
                    [
                        dx_ratio * width,
                        dy_ratio * height,
                    ],
                    dtype=np.float32
                )

                box = projected_box(
                    test_center,
                    width,
                    height,
                    angle + angle_offset
                )

                (
                    visible_ratio,
                    departure,
                ) = score_projected_box(
                    image,
                    box,
                    bed_distance
                )

                # Reward actual visible source and
                # card-like departure from learned bed.
                score = (
                    visible_ratio * 2.0
                    +
                    min(
                        departure / 60.0,
                        1.5
                    )
                )

                record = {
                    "score": score,
                    "box": box,
                    "center": test_center,
                    "angle": (
                        angle
                        + angle_offset
                    ),
                    "visible": visible_ratio,
                    "departure": departure,
                }

                if (
                    best is None
                    or record["score"]
                    > best["score"]
                ):
                    best = record

    canvas = image.copy()

    # Existing accepted cards.
    for name, candidate in occupied.items():
        draw_box(
            canvas,
            candidate[1],
            (80, 220, 80),
            10
        )

        cx, cy = center_of(
            candidate[1]
        )

        cv2.putText(
            canvas,
            name,
            (
                int(cx) - 120,
                int(cy)
            ),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.2,
            (80, 220, 80),
            3,
            cv2.LINE_AA
        )

    # Pure sibling-geometry prediction.
    initial_box = projected_box(
        center,
        width,
        height,
        angle
    )

    draw_box(
        canvas,
        initial_box,
        (0, 215, 255),
        7
    )

    # Image-evidence-adjusted proposal.
    draw_box(
        canvas,
        best["box"],
        (255, 80, 220),
        12
    )

    for point in best["box"]:
        px, py = point

        observed = (
            0 <= px < image.shape[1]
            and
            0 <= py < image.shape[0]
        )

        color = (
            (255, 80, 220)
            if observed
            else (0, 165, 255)
        )

        cv2.circle(
            canvas,
            (
                int(round(px)),
                int(round(py))
            ),
            24,
            color,
            -1,
            cv2.LINE_AA
        )

    label = (
        f"{layout} | "
        f"{missing_slot} | "
        f"visible={best['visible']:.2f} | "
        f"bed-departure={best['departure']:.1f} | "
        f"angle={best['angle']:.1f}"
    )

    cv2.rectangle(
        canvas,
        (0, 0),
        (
            image.shape[1],
            110
        ),
        (20, 20, 20),
        -1
    )

    cv2.putText(
        canvas,
        label,
        (40, 72),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.5,
        (255, 255, 255),
        4,
        cv2.LINE_AA
    )

    destination = (
        OUTPUT /
        f"{layout}_RESCUE.jpg"
    )

    cv2.imwrite(
        str(destination),
        canvas
    )

    print(
        f"{layout}: "
        f"{missing_slot:12} "
        f"visible={best['visible']:.3f} "
        f"bed={best['departure']:.1f} "
        f"angle={best['angle']:.1f} "
        f"-> {destination.name}"
    )


print()
print(
    f"Overlays: {OUTPUT}"
)
print("No crops were written.")
print("No source images were modified.")
