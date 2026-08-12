from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).parent

TEST_NAME = "test-03"

INPUT = ROOT / "input" / TEST_NAME
OUTPUT = ROOT / "output" / TEST_NAME

INPUT.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)

PADDING = 0.02
MIN_AREA_RATIO = 0.025
MAX_AREA_RATIO = 0.35

# If this much of a candidate lies inside a larger candidate,
# treat the smaller candidate as an internal design element.
CONTAINMENT_THRESHOLD = 0.90


def order_points(points):
    points = np.asarray(points, dtype=np.float32)

    s = points.sum(axis=1)
    d = np.diff(points, axis=1).reshape(-1)

    return np.array([
        points[np.argmin(s)],
        points[np.argmin(d)],
        points[np.argmax(s)],
        points[np.argmax(d)],
    ], dtype=np.float32)


def perspective_crop(image, box):
    box = order_points(box)

    tl, tr, br, bl = box

    width = int(max(
        np.linalg.norm(br - bl),
        np.linalg.norm(tr - tl)
    ))

    height = int(max(
        np.linalg.norm(tr - br),
        np.linalg.norm(tl - bl)
    ))

    pad_x = width * PADDING
    pad_y = height * PADDING

    destination = np.array([
        [pad_x, pad_y],
        [width + pad_x, pad_y],
        [width + pad_x, height + pad_y],
        [pad_x, height + pad_y],
    ], dtype=np.float32)

    matrix = cv2.getPerspectiveTransform(
        box,
        destination
    )

    return cv2.warpPerspective(
        image,
        matrix,
        (
            int(width + pad_x * 2),
            int(height + pad_y * 2)
        ),
        borderMode=cv2.BORDER_REPLICATE
    )


def containment_ratio(inner_box, outer_box):
    inner = np.asarray(inner_box, dtype=np.float32)
    outer = np.asarray(outer_box, dtype=np.float32)

    inner_area = abs(cv2.contourArea(inner))

    if inner_area == 0:
        return 0.0

    intersection_area, _ = cv2.intersectConvexConvex(
        inner,
        outer
    )

    return intersection_area / inner_area


def remove_nested_candidates(candidates):
    # Largest first.
    candidates = sorted(
        candidates,
        key=lambda item: item[0],
        reverse=True
    )

    kept = []

    for area, box in candidates:
        nested = False

        for larger_area, larger_box in kept:
            ratio = containment_ratio(
                box,
                larger_box
            )

            if ratio >= CONTAINMENT_THRESHOLD:
                nested = True
                break

        if not nested:
            kept.append((area, box))

    return kept


def process(path):
    image = cv2.imread(str(path))

    if image is None:
        print(f"SKIP: {path.name}")
        return

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

    image_area = (
        image.shape[0] *
        image.shape[1]
    )

    raw_candidates = []

    for contour in contours:
        area = cv2.contourArea(contour)
        ratio = area / image_area

        if not MIN_AREA_RATIO <= ratio <= MAX_AREA_RATIO:
            continue

        rect = cv2.minAreaRect(contour)
        width, height = rect[1]

        if width == 0 or height == 0:
            continue

        aspect = (
            max(width, height) /
            min(width, height)
        )

        if not 1.15 <= aspect <= 1.75:
            continue

        box = cv2.boxPoints(rect)

        # Reject rectangles that occupy too much of the entire scan.
        # This catches scanner/mat/page boundaries that happen to have
        # card-like proportions.
        rect_area = width * height
        rect_area_ratio = rect_area / image_area

        if rect_area_ratio > MAX_AREA_RATIO:
            continue

        raw_candidates.append(
            (rect_area, box)
        )

    debug = image.copy()

    for index, (_, box) in enumerate(
        raw_candidates,
        start=1
    ):
        box_int = np.asarray(
            box,
            dtype=np.int32
        ).reshape((-1, 1, 2))

        cv2.polylines(  # pyright: ignore[reportCallIssue]
            debug,
            box_int,  # pyright: ignore[reportArgumentType]
            True,
            (0, 0, 255),
            8
        )

        x = int(box_int[0, 0, 0])
        y = int(box_int[0, 0, 1])

        cv2.putText(
            debug,
            str(index),
            (int(x), int(y)),
            cv2.FONT_HERSHEY_SIMPLEX,
            2,
            (0, 0, 255),
            6
        )

    cv2.imwrite(
        str(OUTPUT / f"{path.stem}_DEBUG.jpg"),
        debug
    )

    candidates = remove_nested_candidates(
        raw_candidates
    )

    print(
        f"{path.name}: "
        f"{len(raw_candidates)} raw -> "
        f"{len(candidates)} kept"
    )

    for index, (_, box) in enumerate(
        candidates,
        start=1
    ):
        crop = perspective_crop(
            image,
            box
        )

        destination = (
            OUTPUT /
            f"{path.stem}_crop_{index:02}.jpg"
        )

        cv2.imwrite(
            str(destination),
            crop,
            [cv2.IMWRITE_JPEG_QUALITY, 95]
        )


for path in OUTPUT.glob("*"):
    if path.is_file():
        path.unlink()


# Build a history of source filenames from previous test inputs.
previous_inputs = {}

for test_dir in sorted((ROOT / "input").glob("test-*")):
    if test_dir == INPUT:
        continue

    for previous_path in test_dir.glob("*.jpg"):
        previous_inputs.setdefault(
            previous_path.name.lower(),
            []
        ).append(test_dir.name)


processed_count = 0
duplicate_count = 0

for path in sorted(INPUT.glob("*.jpg")):
    previous_tests = previous_inputs.get(
        path.name.lower()
    )

    if previous_tests:
        print(
            f"DUPLICATE: {path.name} "
            f"already tested in {', '.join(previous_tests)} "
            f"-> SKIPPED"
        )
        duplicate_count += 1
        continue

    process(path)
    processed_count += 1


print()
print(
    f"TEST SUMMARY: "
    f"{processed_count} new source(s) processed; "
    f"{duplicate_count} previously tested source(s) skipped."
)
