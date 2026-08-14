from pathlib import Path
import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "working" / "source"
OUTPUT = ROOT / "exception-review"

OUTPUT.mkdir(
    parents=True,
    exist_ok=True
)

# Clean only our derived review images.
for path in OUTPUT.glob("*.jpg"):
    path.unlink()


EXCEPTIONS = [
    "UD_002_A_0099_01",
    "UD_002_B_0003_01",
]


def rotate_cw(image, degrees):
    if degrees == 0:
        return image.copy()

    if degrees == 90:
        return cv2.rotate(
            image,
            cv2.ROTATE_90_CLOCKWISE
        )

    if degrees == 180:
        return cv2.rotate(
            image,
            cv2.ROTATE_180
        )

    if degrees == 270:
        return cv2.rotate(
            image,
            cv2.ROTATE_90_COUNTERCLOCKWISE
        )

    raise ValueError(
        f"Unsupported rotation: {degrees}"
    )


def fit_panel(image, width=900, height=700):
    """
    Fit an image inside a fixed review panel without
    distorting its proportions.
    """

    h, w = image.shape[:2]

    scale = min(
        width / w,
        height / h
    )

    new_w = max(
        1,
        int(w * scale)
    )

    new_h = max(
        1,
        int(h * scale)
    )

    resized = cv2.resize(
        image,
        (new_w, new_h),
        interpolation=cv2.INTER_AREA
    )

    panel = np.full(
        (height, width, 3),
        245,
        dtype=np.uint8
    )

    x = (width - new_w) // 2
    y = (height - new_h) // 2

    panel[
        y:y + new_h,
        x:x + new_w
    ] = resized

    return panel


for pair_key in EXCEPTIONS:

    a_path = SOURCE / f"{pair_key}_a.jpg"
    b_path = SOURCE / f"{pair_key}_b.jpg"

    if not a_path.exists():
        raise FileNotFoundError(
            f"Missing A: {a_path}"
        )

    if not b_path.exists():
        raise FileNotFoundError(
            f"Missing B: {b_path}"
        )

    a = cv2.imread(
        str(a_path)
    )

    b = cv2.imread(
        str(b_path)
    )

    if a is None or b is None:
        raise RuntimeError(
            f"Unable to read pair: {pair_key}"
        )

    # Human truth already established:
    # both exception A images have backbone=BOTTOM,
    # therefore C-open=TOP and A requires 0°.
    canonical_a = a.copy()

    for degrees in (
        0,
        90,
        180,
        270
    ):

        rotated_b = rotate_cw(
            b,
            degrees
        )

        # Comparison-only horizontal flip:
        # turn Wario back into Mario.
        comparison_b = cv2.flip(
            rotated_b,
            1
        )

        a_panel = fit_panel(
            canonical_a
        )

        b_panel = fit_panel(
            comparison_b
        )

        canvas = np.full(
            (
                820,
                a_panel.shape[1] +
                b_panel.shape[1] +
                60,
                3
            ),
            245,
            dtype=np.uint8
        )

        canvas[
            100:800,
            0:900
        ] = a_panel

        canvas[
            100:800,
            960:1860
        ] = b_panel

        cv2.putText(
            canvas,
            "A - CANONICAL",
            (30, 65),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.4,
            (0, 0, 0),
            3
        )

        cv2.putText(
            canvas,
            f"B - {degrees} CW + H-FLIP",
            (990, 65),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.4,
            (0, 0, 0),
            3
        )

        destination = (
            OUTPUT /
            f"{pair_key}_B_{degrees:03}_CW.jpg"
        )

        cv2.imwrite(
            str(destination),
            canvas,
            [
                cv2.IMWRITE_JPEG_QUALITY,
                92
            ]
        )


print()
print("TURTLE EXCEPTION REVIEW")
print("-----------------------")
print(
    f"Exceptions:    "
    f"{len(EXCEPTIONS)}"
)
print(
    "Candidates:    4 each"
)
print(
    f"Review images: "
    f"{OUTPUT}"
)
print()
print(
    "B shown here is horizontally flipped "
    "FOR COMPARISON ONLY."
)
print(
    "Choose the image where the physical "
    "layout matches canonical A."
)
print(
    "The filename gives the required "
    "clockwise B rotation."
)
print()
print(
    "No source images were modified."
)
