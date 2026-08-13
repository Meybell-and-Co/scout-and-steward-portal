from pathlib import Path
import re

import cv2
import numpy as np


SOURCE = Path(
    r"C:\Users\Meybells\Downloads\incoming-assets\inventory-photos\s-and-s-sports-memorabilia\4UP\oriented"
)

MIN_AREA_RATIO = 0.025
MAX_AREA_RATIO = 0.35

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


def quadrant(cx, cy):
    vertical = "TOP" if cy < 0.5 else "BOTTOM"
    horizontal = "LEFT" if cx < 0.5 else "RIGHT"
    return f"{vertical}-{horizontal}"


print()
print("COOKIE TURTLE REJECT FORENSICS")
print("------------------------------")

for layout in FAILURES:

    # Use first available A copy only. Previous audition
    # proved all duplicate copies behave identically.
    matches = sorted(
        SOURCE.glob(f"{layout}_*_a.jpg"),
        key=lambda p: p.name.lower()
    )

    if not matches:
        print(f"{layout}: NO A SOURCE")
        continue

    path = matches[0]

    image = cv2.imread(str(path))

    if image is None:
        print(f"{layout}: UNREADABLE")
        continue

    gray = cv2.cvtColor(
        image,
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

    kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (7, 7)
    )

    # Match baseline detector first.
    edges = cv2.morphologyEx(
        edges,
        cv2.MORPH_CLOSE,
        kernel,
        iterations=2
    )

    contours, _ = cv2.findContours(
        edges,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    height, width = image.shape[:2]
    image_area = height * width

    suspects = []

    for contour in contours:

        contour_area = cv2.contourArea(contour)
        area_ratio = contour_area / image_area

        if not MIN_AREA_RATIO <= area_ratio <= MAX_AREA_RATIO:
            continue

        rect = cv2.minAreaRect(contour)
        rect_width, rect_height = rect[1]

        if rect_width == 0 or rect_height == 0:
            continue

        aspect = (
            max(rect_width, rect_height) /
            min(rect_width, rect_height)
        )

        rect_area_ratio = (
            rect_width *
            rect_height /
            image_area
        )

        box = cv2.boxPoints(rect)

        cx = float(np.mean(box[:, 0])) / width
        cy = float(np.mean(box[:, 1])) / height

        # We only care about objects rejected by one of
        # the downstream geometry gates.
        reasons = []

        if not 1.15 <= aspect <= 1.75:
            reasons.append("ASPECT")

        if rect_area_ratio > MAX_AREA_RATIO:
            reasons.append("RECT_AREA")

        if reasons:
            suspects.append({
                "cx": cx,
                "cy": cy,
                "quadrant": quadrant(cx, cy),
                "aspect": aspect,
                "area": area_ratio,
                "rect_area": rect_area_ratio,
                "reasons": "+".join(reasons),
            })

    # Largest card-like contours first.
    suspects.sort(
        key=lambda item: item["area"],
        reverse=True
    )

    print()
    print(f"{layout} [{path.name}]")

    if not suspects:
        print("  no post-area rejects")
        continue

    for item in suspects[:8]:
        print(
            "  "
            f"{item['quadrant']:12} "
            f"center=({item['cx']:.3f},{item['cy']:.3f}) "
            f"aspect={item['aspect']:.3f} "
            f"area={item['area']:.4f} "
            f"rect={item['rect_area']:.4f} "
            f"REJECT={item['reasons']}"
        )


print()
print("No image files were modified.")