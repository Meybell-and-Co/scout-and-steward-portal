from pathlib import Path
import re
import sys
import math

import cv2
import numpy as np


ROOT = Path(__file__).parent

sys.path.insert(
    0,
    str(ROOT)
)

from test_autocrop import (
    detect_best_candidates,
    sort_candidates_by_slot,
)


SOURCE = Path(
    r"C:\Users\Meybells\Downloads\incoming-assets\inventory-photos\s-and-s-sports-memorabilia\4UP\oriented"
)

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
    "TOP-LEFT":     (0, 0),
    "TOP-RIGHT":    (1, 0),
    "BOTTOM-LEFT":  (0, 1),
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

    horizontal = (
        "LEFT"
        if cx < w / 2
        else "RIGHT"
    )

    vertical = (
        "TOP"
        if cy < h / 2
        else "BOTTOM"
    )

    return f"{vertical}-{horizontal}"


def box_dimensions(box):
    box = np.asarray(
        box,
        dtype=np.float32
    )

    rect = cv2.minAreaRect(
        box
    )

    w, h = rect[1]

    long_side = max(w, h)
    short_side = min(w, h)

    return long_side, short_side


def line_angle(line):
    x1, y1, x2, y2 = line

    angle = math.degrees(
        math.atan2(
            y2 - y1,
            x2 - x1
        )
    )

    angle %= 180.0

    return angle


def angular_distance(a, b):
    delta = abs(a - b) % 180.0

    return min(
        delta,
        180.0 - delta
    )


def line_length(line):
    x1, y1, x2, y2 = line

    return math.hypot(
        x2 - x1,
        y2 - y1
    )



# ---------------------------------------------------------------------
# Rescue Turtle: bounded Island Hunt
# ---------------------------------------------------------------------

DEBUG_DIR = ROOT / "island-hunt-debug"
DEBUG_DIR.mkdir(
    parents=True,
    exist_ok=True
)

ISLAND_ROTATIONS = (
    -20.0,
    -15.0,
    -10.0,
    -5.0,
    0.0,
    5.0,
    10.0,
    15.0,
    20.0,
)

ISLAND_TRANSLATIONS = (
    -0.20,
    -0.10,
    0.0,
    0.10,
    0.20,
)


def order_quad_points(points):
    points = np.asarray(
        points,
        dtype=np.float32
    ).reshape(4, 2)

    result = np.zeros(
        (4, 2),
        dtype=np.float32
    )

    sums = points.sum(axis=1)
    diffs = np.diff(
        points,
        axis=1
    ).reshape(-1)

    result[0] = points[
        np.argmin(sums)
    ]
    result[2] = points[
        np.argmax(sums)
    ]
    result[1] = points[
        np.argmin(diffs)
    ]
    result[3] = points[
        np.argmax(diffs)
    ]

    return result


def quad_dimensions(points):
    points = order_quad_points(
        points
    )

    tl, tr, br, bl = points

    width_top = np.linalg.norm(
        tr - tl
    )
    width_bottom = np.linalg.norm(
        br - bl
    )

    height_left = np.linalg.norm(
        bl - tl
    )
    height_right = np.linalg.norm(
        br - tr
    )

    width = (
        width_top + width_bottom
    ) / 2.0

    height = (
        height_left + height_right
    ) / 2.0

    return (
        max(width, height),
        min(width, height)
    )


def sample_ring_metrics(
    image,
    quad,
    ring_width
):
    """
    Inspect the narrow band immediately OUTSIDE
    a proposed card.

    We are not asking for one exact Epson-blue RGB.
    Instead we reward cool, pale, low-saturation
    scanner-bed pixels and penalize blown-white
    pixels.

    The mask deliberately excludes the card itself.
    """

    h, w = image.shape[:2]

    quad = np.asarray(
        quad,
        dtype=np.float32
    )

    center = np.mean(
        quad,
        axis=0
    )

    distances = np.linalg.norm(
        quad - center,
        axis=1
    )

    mean_radius = max(
        1.0,
        float(np.mean(distances))
    )

    scale = (
        mean_radius + ring_width
    ) / mean_radius

    outer = (
        center
        + (
            quad - center
        ) * scale
    )

    inner_mask = np.zeros(
        (h, w),
        dtype=np.uint8
    )

    outer_mask = np.zeros(
        (h, w),
        dtype=np.uint8
    )

    cv2.fillConvexPoly(
        inner_mask,
        np.round(
            quad
        ).astype(np.int32),
        255
    )

    cv2.fillConvexPoly(
        outer_mask,
        np.round(
            outer
        ).astype(np.int32),
        255
    )

    ring_mask = cv2.subtract(
        outer_mask,
        inner_mask
    )

    ys, xs = np.where(
        ring_mask > 0
    )

    if len(xs) < 100:
        return {
            "blue": 0.0,
            "white": 1.0,
            "coverage": 0.0,
        }

    pixels = image[
        ys,
        xs
    ]

    hsv = cv2.cvtColor(
        pixels.reshape(-1, 1, 3),
        cv2.COLOR_BGR2HSV
    ).reshape(-1, 3)

    b = pixels[:, 0].astype(
        np.float32
    )

    g = pixels[:, 1].astype(
        np.float32
    )

    r = pixels[:, 2].astype(
        np.float32
    )

    saturation = hsv[
        :, 1
    ].astype(np.float32)

    value = hsv[
        :, 2
    ].astype(np.float32)

    # "Hazy blue" is intentionally broad:
    # blue channel modestly dominates red,
    # overall value is bright,
    # saturation stays fairly low.
    blueish = (
        (b >= r + 3.0)
        & (b >= g - 10.0)
        & (value >= 135.0)
        & (saturation <= 95.0)
    )

    # Super-white scanner/background evidence.
    blown_white = (
        (b >= 242.0)
        & (g >= 242.0)
        & (r >= 242.0)
        & (
            np.max(
                pixels,
                axis=1
            )
            - np.min(
                pixels,
                axis=1
            )
            <= 10
        )
    )

    blue_ratio = float(
        np.mean(blueish)
    )

    white_ratio = float(
        np.mean(blown_white)
    )

    return {
        "blue": blue_ratio,
        "white": white_ratio,
        "coverage": 1.0,
    }


def visible_fraction(
    quad,
    image
):
    """
    How much of the proposed quadrangle is actually
    inside the scan?

    Important: < 1.0 is NOT automatically failure.
    Turtle may deliberately project the cutter
    beyond the page rather than invent pixels.
    """

    h, w = image.shape[:2]

    quad = np.asarray(
        quad,
        dtype=np.float32
    )

    area = abs(
        cv2.contourArea(
            quad
        )
    )

    if area <= 1.0:
        return 0.0

    image_rect = np.asarray(
        [
            [0, 0],
            [w - 1, 0],
            [w - 1, h - 1],
            [0, h - 1],
        ],
        dtype=np.float32
    )

    intersection_area, _ = (
        cv2.intersectConvexConvex(
            quad,
            image_rect
        )
    )

    return float(
        max(
            0.0,
            min(
                1.0,
                intersection_area / area
            )
        )
    )


def candidate_score(
    image,
    quad,
    expected_long,
    expected_short
):
    """
    Score a possible missing-card island.

    Positive:
      sibling-sized rectangle
      sane card aspect
      scanner-bed ring
      mostly visible

    Negative:
      skinny/sliver geometry
      wildly wrong size
      super-white ring
    """

    long_side, short_side = (
        quad_dimensions(
            quad
        )
    )

    if short_side <= 1.0:
        return None

    aspect = (
        long_side / short_side
    )

    expected_aspect = (
        expected_long
        / max(
            expected_short,
            1.0
        )
    )

    # Murder the Caligari spaghetti.
    if (
        aspect < 1.10
        or aspect > 2.25
    ):
        return None

    long_error = abs(
        long_side - expected_long
    ) / expected_long

    short_error = abs(
        short_side - expected_short
    ) / expected_short

    size_error = (
        long_error + short_error
    ) / 2.0

    if size_error > 0.45:
        return None

    aspect_error = abs(
        aspect - expected_aspect
    ) / expected_aspect

    visible = visible_fraction(
        quad,
        image
    )

    ring_width = max(
        12,
        int(
            expected_short * 0.035
        )
    )

    ring = sample_ring_metrics(
        image,
        quad,
        ring_width
    )

    size_score = max(
        0.0,
        1.0 - size_error
    )

    aspect_score = max(
        0.0,
        1.0 - aspect_error
    )

    blue_score = ring[
        "blue"
    ]

    white_penalty = ring[
        "white"
    ]

    # Geometry is king.
    # Blue bed is corroboration, not a requirement.
    score = (
        size_score * 4.0
        + aspect_score * 2.5
        + blue_score * 2.0
        + visible * 1.0
        - white_penalty * 2.5
    )

    return {
        "score": float(score),
        "long": float(long_side),
        "short": float(short_side),
        "aspect": float(aspect),
        "visible": float(visible),
        "blue": float(blue_score),
        "white": float(white_penalty),
    }


def projected_slot_center(
    occupied,
    missing_slot,
    image
):
    """
    Estimate the missing card center from the other
    three card centers.

    For a 2x2 layout:

        TL + BR ~= TR + BL

    so the absent fourth center can be projected
    from the other three.

    Falls back to quadrant center if slot occupancy
    is weird.
    """

    centers = {
        name: center_of(
            candidate[1]
        )
        for name, candidate
        in occupied.items()
    }

    if missing_slot == "TOP-LEFT":
        needed = (
            "TOP-RIGHT",
            "BOTTOM-LEFT",
            "BOTTOM-RIGHT",
        )

        if all(
            name in centers
            for name in needed
        ):
            return (
                centers["TOP-RIGHT"]
                + centers["BOTTOM-LEFT"]
                - centers["BOTTOM-RIGHT"]
            )

    elif missing_slot == "TOP-RIGHT":
        needed = (
            "TOP-LEFT",
            "BOTTOM-RIGHT",
            "BOTTOM-LEFT",
        )

        if all(
            name in centers
            for name in needed
        ):
            return (
                centers["TOP-LEFT"]
                + centers["BOTTOM-RIGHT"]
                - centers["BOTTOM-LEFT"]
            )

    elif missing_slot == "BOTTOM-LEFT":
        needed = (
            "TOP-LEFT",
            "BOTTOM-RIGHT",
            "TOP-RIGHT",
        )

        if all(
            name in centers
            for name in needed
        ):
            return (
                centers["TOP-LEFT"]
                + centers["BOTTOM-RIGHT"]
                - centers["TOP-RIGHT"]
            )

    elif missing_slot == "BOTTOM-RIGHT":
        needed = (
            "TOP-RIGHT",
            "BOTTOM-LEFT",
            "TOP-LEFT",
        )

        if all(
            name in centers
            for name in needed
        ):
            return (
                centers["TOP-RIGHT"]
                + centers["BOTTOM-LEFT"]
                - centers["TOP-LEFT"]
            )

    h, w = image.shape[:2]

    col, row = SLOTS[
        missing_slot
    ]

    return np.asarray(
        [
            w * (
                0.25
                if col == 0
                else 0.75
            ),
            h * (
                0.25
                if row == 0
                else 0.75
            ),
        ],
        dtype=np.float32
    )


def sibling_angle(candidates):
    """
    Use the median sibling-card angle as Turtle's
    neutral orientation.
    """

    angles = []

    for candidate in candidates:

        box = np.asarray(
            candidate[1],
            dtype=np.float32
        )

        rect = cv2.minAreaRect(
            box
        )

        (_, _), (rw, rh), angle = rect

        if rw < rh:
            angle += 90.0

        while angle >= 90.0:
            angle -= 180.0

        while angle < -90.0:
            angle += 180.0

        angles.append(
            float(angle)
        )

    if not angles:
        return 0.0

    return float(
        np.median(
            angles
        )
    )


def make_quad(
    center,
    long_side,
    short_side,
    angle
):
    rect = (
        (
            float(center[0]),
            float(center[1]),
        ),
        (
            float(long_side),
            float(short_side),
        ),
        float(angle),
    )

    return cv2.boxPoints(
        rect
    ).astype(
        np.float32
    )


def island_hunt(
    image,
    occupied,
    candidates,
    missing_slot,
    median_long,
    median_short
):
    """
    Let Turtle grope around the expected missing
    location.

    Search:
      +/- 20 percent horizontally
      +/- 20 percent vertically
      +/- 20 degrees

    Candidate dimensions stay inherited from the
    three known siblings.
    """

    projected = projected_slot_center(
        occupied,
        missing_slot,
        image
    )

    neutral_angle = sibling_angle(
        candidates
    )

    results = []

    step_x = median_short
    step_y = median_long

    for dx_fraction in ISLAND_TRANSLATIONS:
        for dy_fraction in ISLAND_TRANSLATIONS:
            for angle_offset in ISLAND_ROTATIONS:

                center = np.asarray(
                    [
                        projected[0]
                        + dx_fraction
                        * step_x,

                        projected[1]
                        + dy_fraction
                        * step_y,
                    ],
                    dtype=np.float32
                )

                angle = (
                    neutral_angle
                    + angle_offset
                )

                quad = make_quad(
                    center,
                    median_long,
                    median_short,
                    angle
                )

                metrics = candidate_score(
                    image,
                    quad,
                    median_long,
                    median_short
                )

                if metrics is None:
                    continue

                metrics.update({
                    "quad": quad,
                    "center": center,
                    "angle": float(angle),
                    "dx": float(dx_fraction),
                    "dy": float(dy_fraction),
                })

                results.append(
                    metrics
                )

    results.sort(
        key=lambda item: item["score"],
        reverse=True
    )

    return (
        projected,
        neutral_angle,
        results
    )


def draw_island_debug(
    image,
    layout,
    missing_slot,
    occupied,
    projected,
    results
):
    debug = image.copy()

    # Known good cards: green.
    for name, candidate in occupied.items():

        box = np.asarray(
            candidate[1],
            dtype=np.int32
        )

        cv2.polylines(
            debug,
            [box],
            True,
            (0, 255, 0),
            8,
            cv2.LINE_AA
        )

        center = center_of(
            candidate[1]
        )

        cv2.putText(
            debug,
            name,
            (
                int(center[0]),
                int(center[1])
            ),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.2,
            (0, 255, 0),
            3,
            cv2.LINE_AA
        )

    # Mathematical fourth-corner projection.
    cv2.drawMarker(
        debug,
        (
            int(projected[0]),
            int(projected[1])
        ),
        (255, 255, 0),
        cv2.MARKER_CROSS,
        80,
        8,
        cv2.LINE_AA
    )

    # Show top five auditions faintly.
    for result in results[1:5]:

        quad = np.round(
            result["quad"]
        ).astype(np.int32)

        cv2.polylines(
            debug,
            [quad],
            True,
            (0, 215, 255),
            4,
            cv2.LINE_AA
        )

    if results:

        best = results[0]

        quad = np.round(
            best["quad"]
        ).astype(np.int32)

        # Winning cookie cutter: magenta.
        cv2.polylines(
            debug,
            [quad],
            True,
            (255, 0, 255),
            9,
            cv2.LINE_AA
        )

        for point in quad:
            cv2.circle(
                debug,
                tuple(point),
                18,
                (255, 0, 255),
                -1,
                cv2.LINE_AA
            )

        label = (
            f"{layout} | {missing_slot} | "
            f"score={best['score']:.2f} | "
            f"blue={best['blue']:.2f} | "
            f"white={best['white']:.2f} | "
            f"visible={best['visible']:.2f} | "
            f"angle={best['angle']:.1f}"
        )

    else:
        label = (
            f"{layout} | {missing_slot} | "
            "NO ISLAND CANDIDATE"
        )

    cv2.rectangle(
        debug,
        (0, 0),
        (
            debug.shape[1],
            95
        ),
        (20, 20, 20),
        -1
    )

    cv2.putText(
        debug,
        label,
        (25, 62),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.25,
        (255, 255, 255),
        3,
        cv2.LINE_AA
    )

    output = (
        DEBUG_DIR
        / f"{layout}_ISLAND_DEBUG.jpg"
    )

    cv2.imwrite(
        str(output),
        debug,
        [
            cv2.IMWRITE_JPEG_QUALITY,
            90
        ]
    )

    return output

print()
print("RESCUE TURTLE SPEED-SQUARE AUDITION")
print("-----------------------------------")


for layout in FAILURES:

    matches = sorted(
        SOURCE.glob(
            f"{layout}_*_a.jpg"
        ),
        key=lambda p: p.name.lower()
    )

    if not matches:
        print()
        print(f"{layout}: NO A SOURCE")
        continue

    path = matches[0]

    image = cv2.imread(
        str(path)
    )

    if image is None:
        print()
        print(f"{layout}: UNREADABLE")
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
        print()
        print(
            f"{layout}: "
            f"expected 3 primary candidates, "
            f"found {len(candidates)}"
        )
        continue

    occupied = {}

    for candidate in candidates:
        name = slot_name(
            candidate[1],
            image
        )

        occupied[name] = candidate

    missing = [
        name
        for name in SLOTS
        if name not in occupied
    ]

    print()
    print(
        f"{layout} [{path.name}]"
    )

    if len(missing) != 1:
        print(
            "  Missing slot: AMBIGUOUS "
            f"({', '.join(missing)})"
        )
        continue

    missing_slot = missing[0]

    dimensions = [
        box_dimensions(
            candidate[1]
        )
        for candidate in candidates
    ]

    median_long = float(
        np.median([
            item[0]
            for item in dimensions
        ])
    )

    median_short = float(
        np.median([
            item[1]
            for item in dimensions
        ])
    )

    h, w = image.shape[:2]

    # ---------------------------------------------------------
    # ISLAND HUNT
    # ---------------------------------------------------------

    (
        projected_center,
        neutral_angle,
        island_results,
    ) = island_hunt(
        image,
        occupied,
        candidates,
        missing_slot,
        median_long,
        median_short
    )

    island_debug = draw_island_debug(
        image,
        layout,
        missing_slot,
        occupied,
        projected_center,
        island_results
    )

    print(
        f"  Island origin: "
        f"{projected_center[0]:.0f}, "
        f"{projected_center[1]:.0f}px"
    )

    print(
        f"  Sibling angle: "
        f"{neutral_angle:.1f}°"
    )

    print(
        f"  Island trials: "
        f"{len(island_results)}"
    )

    if island_results:

        best_island = island_results[0]

        print(
            f"  Island best:   "
            f"{best_island['score']:.2f}"
        )

        print(
            f"  Island move:   "
            f"x={best_island['dx']:+.2f} "
            f"y={best_island['dy']:+.2f}"
        )

        print(
            f"  Island angle:  "
            f"{best_island['angle']:.1f}°"
        )

        print(
            f"  Blue ring:     "
            f"{best_island['blue']:.3f}"
        )

        print(
            f"  White ring:    "
            f"{best_island['white']:.3f}"
        )

        print(
            f"  Visible:       "
            f"{best_island['visible']:.3f}"
        )

    else:

        print(
            "  Island best:   "
            "NONE"
        )

    print(
        f"  Island debug:  "
        f"{island_debug.name}"
    )

    col, row = SLOTS[
        missing_slot
    ]

    # Missing quadrant, expanded slightly toward
    # image center so we don't lose an edge that
    # straddles the mathematical quadrant boundary.
    overlap_x = int(
        median_short * 0.35
    )

    overlap_y = int(
        median_short * 0.35
    )

    if col == 0:
        x1 = 0
        x2 = min(
            w,
            w // 2 + overlap_x
        )
    else:
        x1 = max(
            0,
            w // 2 - overlap_x
        )
        x2 = w

    if row == 0:
        y1 = 0
        y2 = min(
            h,
            h // 2 + overlap_y
        )
    else:
        y1 = max(
            0,
            h // 2 - overlap_y
        )
        y2 = h

    roi = image[
        y1:y2,
        x1:x2
    ]

    gray = cv2.cvtColor(
        roi,
        cv2.COLOR_BGR2GRAY
    )

    gray = cv2.GaussianBlur(
        gray,
        (5, 5),
        0
    )

    edges = cv2.Canny(
        gray,
        40,
        120
    )

    min_line_length = int(
        median_short * 0.35
    )

    max_line_gap = int(
        median_short * 0.08
    )

    lines = cv2.HoughLinesP(
        edges,
        1,
        np.pi / 180,
        threshold=50,
        minLineLength=max(
            25,
            min_line_length
        ),
        maxLineGap=max(
            10,
            max_line_gap
        )
    )

    line_records = []

    if lines is not None:

        # OpenCV may return HoughLinesP in slightly
        # different NumPy shapes. Normalize every
        # result to one x1,y1,x2,y2 row.
        normalized_lines = np.asarray(
            lines
        ).reshape(-1, 4)

        for raw in normalized_lines:

            line = tuple(
                int(value)
                for value in raw
            )

            angle = line_angle(
                line
            )

            length = line_length(
                line
            )

            line_records.append({
                "line": line,
                "angle": angle,
                "length": length,
            })

    line_records.sort(
        key=lambda item: item["length"],
        reverse=True
    )

    # Use the strongest line as one leg of our
    # speed square. The second family should be
    # approximately perpendicular to it.
    if line_records:
        reference_angle = (
            line_records[0]["angle"]
        )

        perpendicular_angle = (
            reference_angle + 90.0
        ) % 180.0

        family_a = [
            item
            for item in line_records
            if angular_distance(
                item["angle"],
                reference_angle
            ) <= 8.0
        ]

        family_b = [
            item
            for item in line_records
            if angular_distance(
                item["angle"],
                perpendicular_angle
            ) <= 8.0
        ]

    else:
        reference_angle = None
        perpendicular_angle = None
        family_a = []
        family_b = []

    print(
        f"  Primary:       "
        f"3/4 [{detection_pass}]"
    )

    print(
        f"  Missing slot:  "
        f"{missing_slot}"
    )

    print(
        f"  Sibling size:  "
        f"{median_long:.1f} x "
        f"{median_short:.1f}px"
    )

    print(
        f"  ROI:           "
        f"x={x1}:{x2} "
        f"y={y1}:{y2}"
    )

    print(
        f"  Hough lines:   "
        f"{len(line_records)}"
    )

    if reference_angle is None:
        print(
            "  Speed square:  NO LINE EVIDENCE"
        )
        continue

    print(
        f"  Family A:      "
        f"{len(family_a)} "
        f"near {reference_angle:.1f}°"
    )

    print(
        f"  Family B:      "
        f"{len(family_b)} "
        f"near {perpendicular_angle:.1f}°"
    )

    if (
        len(family_a) >= 2
        and len(family_b) >= 2
    ):
        verdict = "STRONG LINE EVIDENCE"

    elif (
        len(family_a) >= 1
        and len(family_b) >= 1
    ):
        verdict = "PARTIAL LINE EVIDENCE"

    else:
        verdict = "WEAK LINE EVIDENCE"

    print(
        f"  Verdict:       "
        f"{verdict}"
    )

    print(
        "  Strongest:     "
        + ", ".join(
            (
                f"{item['angle']:.1f}°/"
                f"{item['length']:.0f}px"
            )
            for item
            in line_records[:6]
        )
    )


print()
print(
    "No crops were written."
)
print(
    "No source images were modified."
)

