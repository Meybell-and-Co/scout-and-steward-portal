from pathlib import Path
import csv
import re
import shutil

import cv2
import numpy as np

ROOT = Path(__file__).parent

CANON_SOURCE = Path(
    r"C:\Users\Meybells\Downloads\incoming-assets\inventory-photos\s-and-s-sports-memorabilia\4UP\source"
)

WORKING_ROOT = ROOT / "working"
WORKING_SOURCE = WORKING_ROOT / "source"
SOURCE_MANIFEST = ROOT / "4up-source-manifest.csv"

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


SOURCE_PATTERN = re.compile(
    r"^(?P<pair_key>.+)_(?P<side>[ab])$",
    re.IGNORECASE
)

SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


def inventory_canon():
    if not CANON_SOURCE.exists():
        raise RuntimeError(
            f"Canon source does not exist: {CANON_SOURCE}"
        )

    source_files = sorted(
        (
            path
            for path in CANON_SOURCE.iterdir()
            if path.is_file()
            and path.suffix.lower() in SUPPORTED_EXTENSIONS
        ),
        key=lambda path: path.name.lower()
    )

    if not source_files:
        raise RuntimeError(
            f"No supported source images found in {CANON_SOURCE}"
        )

    records = []
    errors = []

    for path in source_files:
        if "__" in path.stem:
            errors.append(
                f"DOUBLE UNDERSCORE: {path.name}"
            )
            continue

        match = SOURCE_PATTERN.match(path.stem)

        if not match:
            errors.append(
                f"INVALID A/B NAME: {path.name}"
            )
            continue

        records.append({
            "name": path.name,
            "full_path": str(path),
            "extension": path.suffix.lower(),
            "pair_key": match.group("pair_key"),
            "side": match.group("side").lower(),
            "size_bytes": path.stat().st_size,
        })

    if errors:
        details = "\n".join(
            f"  - {error}"
            for error in errors
        )

        raise RuntimeError(
            "SOURCE FILENAME AUDIT FAILED:\n"
            f"{details}"
        )

    return records


def validate_pairs(records):
    pairs = {}

    for record in records:
        pair = pairs.setdefault(
            record["pair_key"],
            {}
        )

        side = record["side"]

        if side in pair:
            raise RuntimeError(
                "DUPLICATE SIDE: "
                f"{record['pair_key']} has more than one "
                f"side {side.upper()}."
            )

        pair[side] = record

    errors = []

    for pair_key, sides in sorted(pairs.items()):
        missing = [
            side.upper()
            for side in ("a", "b")
            if side not in sides
        ]

        if missing:
            errors.append(
                f"{pair_key}: missing {', '.join(missing)}"
            )

    if errors:
        details = "\n".join(
            f"  - {error}"
            for error in errors
        )

        raise RuntimeError(
            "A/B PAIR AUDIT FAILED:\n"
            f"{details}"
        )

    return pairs


def write_source_manifest(records):
    SOURCE_MANIFEST.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    fieldnames = [
        "name",
        "full_path",
        "extension",
        "pair_key",
        "side",
        "size_bytes",
    ]

    with SOURCE_MANIFEST.open(
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


def copy_sources_to_working(records):
    WORKING_SOURCE.mkdir(
        parents=True,
        exist_ok=True
    )

    expected_names = {
        record["name"]
        for record in records
    }

    # Working/source is disposable. Remove stale files
    # that are no longer present in Canon.
    for existing in WORKING_SOURCE.iterdir():
        if (
            existing.is_file()
            and existing.name not in expected_names
        ):
            existing.unlink()

    copied = 0
    unchanged = 0

    for record in records:
        source = Path(record["full_path"])
        destination = WORKING_SOURCE / record["name"]

        if (
            destination.exists()
            and destination.stat().st_size
            == source.stat().st_size
            and destination.stat().st_mtime_ns
            == source.stat().st_mtime_ns
        ):
            unchanged += 1
            continue

        shutil.copy2(
            source,
            destination
        )

        copied += 1

    return copied, unchanged


def prepare_source_roster():
    records = inventory_canon()
    pairs = validate_pairs(records)

    write_source_manifest(records)

    copied, unchanged = copy_sources_to_working(
        records
    )

    source_count = len(records)
    pair_count = len(pairs)
    expected_card_count = pair_count * 4

    print()
    print("TURTLE SOURCE ROSTER")
    print("--------------------")
    print(f"Source files:   {source_count}")
    print(f"A/B pairs:      {pair_count}")
    print(f"Cards expected: {expected_card_count}")
    print(f"Copied:         {copied}")
    print(f"Unchanged:      {unchanged}")
    print(f"Manifest:       {SOURCE_MANIFEST}")
    print(f"Working source: {WORKING_SOURCE}")
    print("Pair audit:     CLEAN")
    print()

    return records, pairs

def measure_dark_edges(image):
    """
    Measure how much very-dark material appears near each outer edge.

    This is reconnaissance only. It does NOT rotate or modify the image.
    The goal is to learn the signature made by our asymmetric black-paper
    bracket before we trust it to orient working copies.
    """
    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    height, width = gray.shape

    # Examine the outer 15% of each edge.
    x_band = max(1, int(width * 0.15))
    y_band = max(1, int(height * 0.15))

    dark_threshold = 55

    top = gray[:y_band, :]
    right = gray[:, width - x_band:]
    bottom = gray[height - y_band:, :]
    left = gray[:, :x_band]

    def dark_ratio(region):
        return float(
            np.count_nonzero(region < dark_threshold)
        ) / region.size

    return {
        "top": dark_ratio(top),
        "right": dark_ratio(right),
        "bottom": dark_ratio(bottom),
        "left": dark_ratio(left),
    }


def write_orientation_recon(pairs):
    destination = ROOT / "orientation-recon.csv"

    rows = []

    pair_keys = sorted(pairs)
    total_pairs = len(pair_keys)

    for pair_number, pair_key in enumerate(
        pair_keys,
        start=1
    ):
        print(
            f"  Recon {pair_number}/{total_pairs}: "
            f"{pair_key}",
            flush=True
        )

        pair = pairs[pair_key]

        a_record = pair.get("a")

        if a_record is None:
            continue

        a_path = (
            WORKING_SOURCE /
            a_record["name"]
        )

        image = cv2.imread(str(a_path))

        if image is None:
            raise RuntimeError(
                f"Unable to read orientation source: {a_path}"
            )

        scores = measure_dark_edges(image)

        ranked = sorted(
            scores.items(),
            key=lambda item: item[1],
            reverse=True
        )

        strongest_edge, strongest_score = ranked[0]
        second_edge, second_score = ranked[1]

        margin = strongest_score - second_score

        rows.append({
            "PairKey": pair_key,
            "TopDark": f"{scores['top']:.4f}",
            "RightDark": f"{scores['right']:.4f}",
            "BottomDark": f"{scores['bottom']:.4f}",
            "LeftDark": f"{scores['left']:.4f}",
            "StrongestEdge": strongest_edge,
            "StrongestScore": f"{strongest_score:.4f}",
            "SecondScore": f"{second_score:.4f}",
            "Margin": f"{margin:.4f}",
        })

    fieldnames = [
        "PairKey",
        "TopDark",
        "RightDark",
        "BottomDark",
        "LeftDark",
        "StrongestEdge",
        "StrongestScore",
        "SecondScore",
        "Margin",
    ]

    with destination.open(
        "w",
        newline="",
        encoding="utf-8"
    ) as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=fieldnames
        )

        writer.writeheader()
        writer.writerows(rows)

    print("TURTLE ORIENTATION RECON")
    print("------------------------")
    print(f"Pairs measured: {len(rows)}")
    print(f"Recon manifest: {destination}")
    print()

    return rows

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


def detect_candidates(image, morphology_iterations):
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
        iterations=morphology_iterations
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

        rect_area = width * height
        rect_area_ratio = rect_area / image_area

        if rect_area_ratio > MAX_AREA_RATIO:
            continue

        box = cv2.boxPoints(rect)

        raw_candidates.append(
            (rect_area, box)
        )

    candidates = remove_nested_candidates(
        raw_candidates
    )

    return raw_candidates, candidates


def draw_debug(image, candidates, destination):
    debug = image.copy()

    for index, (_, box) in enumerate(
        candidates,
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
            (x, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            2,
            (0, 0, 255),
            6
        )

    cv2.imwrite(
        str(destination),
        debug
    )


def save_crops(image, candidates, stem):
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
            f"{stem}_crop_{index:02}.jpg"
        )

        cv2.imwrite(
            str(destination),
            crop,
            [cv2.IMWRITE_JPEG_QUALITY, 95]
        )


def detect_best_candidates(image):
    baseline_raw, baseline_candidates = detect_candidates(
        image,
        morphology_iterations=2
    )

    selected_raw = baseline_raw
    selected_candidates = baseline_candidates
    selected_pass = "baseline"

    if len(baseline_candidates) < 4:
        rescue_raw, rescue_candidates = detect_candidates(
            image,
            morphology_iterations=3
        )

        if len(rescue_candidates) > len(baseline_candidates):
            selected_raw = rescue_raw
            selected_candidates = rescue_candidates
            selected_pass = "rescue"

    return (
        selected_raw,
        selected_candidates,
        selected_pass,
        len(baseline_candidates)
    )


def sort_candidates_by_slot(candidates):
    if len(candidates) != 4:
        return candidates

    # Split into upper and lower rows by center Y.
    by_y = sorted(
        candidates,
        key=lambda item: float(np.mean(item[1][:, 1]))
    )

    top = by_y[:2]
    bottom = by_y[2:]

    # Within each row: left, then right.
    top = sorted(
        top,
        key=lambda item: float(np.mean(item[1][:, 0]))
    )

    bottom = sorted(
        bottom,
        key=lambda item: float(np.mean(item[1][:, 0]))
    )

    return [
        top[0],       # 01 = top-left
        top[1],       # 02 = top-right
        bottom[0],    # 03 = bottom-left
        bottom[1],    # 04 = bottom-right
    ]

def normalized_centers(image, candidates):
    image_height, image_width = image.shape[:2]

    centers = []

    for _, box in candidates:
        center_x = float(np.mean(box[:, 0])) / image_width
        center_y = float(np.mean(box[:, 1])) / image_height

        centers.append(
            (round(center_x, 3), round(center_y, 3))
        )

    return centers


def mirror_candidates_to_image(
    source_image,
    destination_image,
    candidates
):
    source_height, source_width = source_image.shape[:2]
    destination_height, destination_width = destination_image.shape[:2]

    mirrored = []

    for area, box in candidates:
        normalized = np.asarray(
            box,
            dtype=np.float32
        ).copy()

        normalized[:, 0] /= source_width
        normalized[:, 1] /= source_height

        # Horizontal mirror: x becomes 1 - x.
        normalized[:, 0] = 1.0 - normalized[:, 0]

        destination_box = normalized.copy()
        destination_box[:, 0] *= destination_width
        destination_box[:, 1] *= destination_height

        mirrored.append(
            (area, destination_box)
        )

    return mirrored


MARK_TO_DO = OUTPUT / "mark-to-do"


def candidate_slot_name(image, candidate):
    """
    Assign one trusted candidate to a 2x2 quadrant
    using its center relative to image center.
    """

    h, w = image.shape[:2]

    _, box = candidate

    center_x = float(box[:, 0].mean())
    center_y = float(box[:, 1].mean())

    if center_x < w / 2:
        horizontal = "L"
    else:
        horizontal = "R"

    if center_y < h / 2:
        vertical = "U"
    else:
        vertical = "L"

    return vertical + horizontal


def missing_quadrant(image, candidates):
    """
    Return UL / UR / LL / LR only when exactly
    three distinct trusted quadrants are occupied.

    Otherwise return UNK.
    """

    expected = {
        "UL",
        "UR",
        "LL",
        "LR",
    }

    occupied = {
        candidate_slot_name(
            image,
            candidate
        )
        for candidate in candidates
    }

    missing = expected - occupied

    if (
        len(candidates) == 3
        and len(occupied) == 3
        and len(missing) == 1
    ):
        return missing.pop()

    return "UNK"


def copy_to_mark_to_do(path, quadrant):
    """
    Copy an original source scan into the human
    work queue without touching the source.

    Example:
        UD_001_C_056_01_a.jpg
        ->
        UD_001_C_056_01_a_UL.jpg
    """

    MARK_TO_DO.mkdir(
        parents=True,
        exist_ok=True
    )

    destination = (
        MARK_TO_DO
        / f"{path.stem}_{quadrant}{path.suffix}"
    )

    shutil.copy2(
        path,
        destination
    )

    return destination

def pair_key(path):
    stem = path.stem

    if stem.endswith("_a") or stem.endswith("_b"):
        return stem[:-2]

    return None


def process_pair(a_path, b_path):
    expected_count = 4

    a_image = cv2.imread(str(a_path))

    if a_image is None:
        print(f"SKIP: {a_path.name}")
        copy_to_mark_to_do(
            a_path,
            "UNK"
        )
        return

    (
        _,
        a_candidates,
        a_pass,
        a_baseline_count
    ) = detect_best_candidates(a_image)

    a_found_count = len(a_candidates)

    if a_found_count == expected_count:
        a_candidates = sort_candidates_by_slot(
            a_candidates
        )

    draw_debug(
        a_image,
        a_candidates,
        OUTPUT / f"{a_path.stem}_DEBUG.jpg"
    )

    save_crops(
        a_image,
        a_candidates,
        a_path.stem
    )

    a_status = (
        "READY"
        if a_found_count == expected_count
        else "MANUAL"
    )

    print(
        f"{a_path.name}: "
        f"{a_found_count}/{expected_count} "
        f"{a_status} "
        f"[{a_pass}] "
        f"(baseline={a_baseline_count}) "
        f"centers={normalized_centers(a_image, a_candidates)}"
    )

    if a_found_count != expected_count:
        a_quadrant = missing_quadrant(
            a_image,
            a_candidates
        )

        copy_to_mark_to_do(
            a_path,
            a_quadrant
        )

        if b_path is not None:
            b_quadrant = {
                "UL": "UR",
                "UR": "UL",
                "LL": "LR",
                "LR": "LL",
            }.get(
                a_quadrant,
                "UNK"
            )

            copy_to_mark_to_do(
                b_path,
                b_quadrant
            )

    if b_path is None:
        print(
            f"  PAIR: no matching _b source -> MANUAL"
        )
        return

    b_image = cv2.imread(str(b_path))

    if b_image is None:
        print(
            f"  PAIR: unable to read {b_path.name} -> MANUAL"
        )

        copy_to_mark_to_do(
            b_path,
            "UNK"
        )
        return

    if a_found_count != expected_count:
        print(
            f"{b_path.name}: "
            f"0/{expected_count} MANUAL "
            f"[A not trustworthy; mirror not applied]"
        )
        return

    b_candidates = mirror_candidates_to_image(
        a_image,
        b_image,
        a_candidates
    )

    draw_debug(
        b_image,
        b_candidates,
        OUTPUT / f"{b_path.stem}_DEBUG.jpg"
    )

    save_crops(
        b_image,
        b_candidates,
        b_path.stem
    )

    print(
        f"{b_path.name}: "
        f"{len(b_candidates)}/{expected_count} "
        f"READY "
        f"[mirrored from A] "
        f"centers={normalized_centers(b_image, b_candidates)}"
    )

def main():
    source_records, source_pairs = prepare_source_roster()

    write_orientation_recon(source_pairs)


    for path in OUTPUT.glob("*"):
        if path.is_file():
            path.unlink()

    if MARK_TO_DO.exists():
        shutil.rmtree(
            MARK_TO_DO
        )

    MARK_TO_DO.mkdir(
        parents=True,
        exist_ok=True
    )

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
    manual_count = 0

    current_files = {
        path.name.lower(): path
        for path in INPUT.glob("*.jpg")
    }

    a_paths = sorted(
        path
        for path in INPUT.glob("*.jpg")
        if path.stem.endswith("_a")
    )

    for a_path in a_paths:
        previous_tests = previous_inputs.get(
            a_path.name.lower()
        )

        if previous_tests:
            print(
                f"DUPLICATE: {a_path.name} "
                f"already tested in {', '.join(previous_tests)} "
                f"-> SKIPPED"
            )
            duplicate_count += 1
            continue

        key = pair_key(a_path)

        b_name = f"{key}_b{a_path.suffix}".lower()
        b_path = current_files.get(b_name)

        process_pair(
            a_path,
            b_path
        )

        processed_count += 1


    print()
    print(
        f"TEST SUMMARY: "
        f"{processed_count} A/B pair(s) processed; "
        f"{duplicate_count} previously tested A source(s) skipped."
    )


if __name__ == "__main__":
    main()





